import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { useKeepAwake } from 'expo-keep-awake';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TableArena } from '@/components/live-game/table-arena';
import { DeckImage } from '@/components/deck/deck-image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { colors, radii, spacing } from '@/constants/theme';
import {
  applyLiveGameMutation,
  createLiveGamePlayer,
  createLiveGameSummary,
  getSuggestedWinner,
  parseLiveGameState,
  type LiveGameMutation,
  type LiveGameState,
} from '@/lib/live-game';
import type { ParticipantKey } from '@/lib/participant-keys';
import { searchCommandersDirect } from '@/lib/scryfall-search';
import type { CommanderSearchResult } from '@/lib/commander-types';
import { useLanguage } from '@/contexts/language-context';
import {
  clearLiveGameRuntimePlayers,
  replaceLiveGameRuntimePlayers,
} from '@/stores/live-game-runtime-store';

const STORAGE_KEY = 'phyrexian:standalone-counter:v1';
const CARD_COLORS = ['#18181b', '#7f1d1d', '#1e3a8a', '#14532d', '#713f12', '#581c87'];
type Format = 'commander' | 'classic';
type SetupPlayer = { name: string; commander: string; commanderImage: string | null; color: string };

export default function CounterScreen() {
  useKeepAwake();
  const router = useRouter();
  const { copy } = useLanguage();
  const [format, setFormat] = useState<Format>('commander');
  const [playerCount, setPlayerCount] = useState(4);
  const [setup, setSetup] = useState<SetupPlayer[]>(() => Array.from({ length: 6 }, (_, index) => ({
    name: `Player ${index + 1}`,
    commander: '',
    commanderImage: null,
    color: CARD_COLORS[index],
  })));
  const [state, setState] = useState<LiveGameState | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [history, setHistory] = useState<LiveGameState[]>([]);
  const [redo, setRedo] = useState<LiveGameState[]>([]);
  const [highlight, setHighlight] = useState<ParticipantKey | null>(null);
  const [recap, setRecap] = useState<LiveGameState | null>(null);
  const [recapEndedAt, setRecapEndedAt] = useState(0);
  const [searchIndex, setSearchIndex] = useState<number | null>(null);
  const [searchResults, setSearchResults] = useState<CommanderSearchResult[]>([]);

  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const stored = JSON.parse(raw) as { format: Format; state: LiveGameState; startedAt: string };
        if (stored.state?.players?.length) {
          setFormat(stored.format);
          setState(parseLiveGameState(stored.state));
          setStartedAt(stored.startedAt);
        }
      } catch { /* Ignore invalid local state. */ }
    });
  }, []);

  useEffect(() => {
    if (!state || !startedAt) return;
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ format, state, startedAt }));
  }, [format, startedAt, state]);

  useEffect(() => {
    replaceLiveGameRuntimePlayers(state?.players ?? []);
  }, [state?.players]);

  useEffect(() => () => {
    clearLiveGameRuntimePlayers();
  }, []);

  const mutate = (mutation: LiveGameMutation) => {
    if (!state) return;
    setHistory((current) => [...current.slice(-29), state]);
    setRedo([]);
    const next = applyLiveGameMutation(state, {
      ...mutation,
      eventId: Crypto.randomUUID(),
      occurredAt: new Date().toISOString(),
    });
    setState(next);
  };

  const start = async () => {
    const keys = Array.from(
      { length: playerCount },
      (_, index) => `guest:local-${index + 1}` as ParticipantKey,
    );
    const players = keys.map((participantKey, index) => createLiveGamePlayer({
      slot: index,
      participantKey,
      deckId: `local-${index + 1}`,
      displayName: setup[index].name.trim() || `Player ${index + 1}`,
      commander: format === 'commander' ? setup[index].commander.trim() || 'Commander' : 'Magic',
      commanderImage: format === 'commander' ? setup[index].commanderImage : null,
      backgroundColor: setup[index].color,
      startingLife: format === 'commander' ? 40 : 20,
      allParticipantKeys: keys,
    }));
    const nextState = { version: 0, players, events: [], summary: createLiveGameSummary(), layoutVariant: 'classic' } satisfies LiveGameState;
    setState(nextState);
    setStartedAt(new Date().toISOString());
    setRecap(null);
    setRecapEndedAt(0);
  };

  const searchCommander = async (index: number, query: string) => {
    setSetup((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, commander: query, commanderImage: null } : item));
    setSearchIndex(index);
    if (query.trim().length < 2) return setSearchResults([]);
    try {
      setSearchResults(await searchCommandersDirect(query));
    } catch {
      setSearchResults([]);
    }
  };

  if (recap) {
    const durationMinutes = startedAt
      ? Math.max(0, Math.round((recapEndedAt - new Date(startedAt).getTime()) / 60000))
      : 0;
    const winner = getSuggestedWinner(recap);
    const formatLabel = format === 'commander' ? 'Commander' : copy('classicMagic');
    const winnerLabel = winner?.displayName ?? copy('quickGameWinnerUnknown');
    const recapText = [
      `Tracker & Analytics · ${copy('quickGameSummary')}`,
      copy('quickGameFormat').replace('{value}', formatLabel),
      copy('quickGameDuration').replace('{value}', String(durationMinutes)),
      copy('quickGameWinner').replace('{value}', winnerLabel),
      '',
      ...recap.players.map((player) => `${player.displayName}: ${player.life} ${copy('quickGameLife')} · ${player.infect} ${copy('quickGamePoison')} · ${Object.values(player.commanderDamageFrom).reduce((sum, value) => sum + value, 0)} ${copy('quickGameCommanderDamage')}`),
    ].join('\n');
    return <Screen background="solid">
      <ScrollView contentContainerStyle={styles.setupContent}>
        <Text style={styles.title}>{copy('quickGameSummary')}</Text>
        <Text style={styles.subtitle}>{formatLabel} · {durationMinutes} min · {winner ? copy('quickGameWinner').replace('{value}', winner.displayName) : copy('quickGameWinnerUnknown')}</Text>
        {recap.players.map((player) => <View key={player.participantKey} style={styles.recapPlayer}>
          <View style={[styles.recapAccent, { backgroundColor: player.backgroundColor ?? colors.primary }]} />
          <View style={styles.recapCopy}><Text style={styles.recapName} numberOfLines={1}>{player.displayName}</Text><Text style={styles.recapCommander} numberOfLines={1}>{player.commander}</Text><Text style={styles.recapMeta}>{player.infect} {copy('quickGamePoison')} · {Object.values(player.commanderDamageFrom).reduce((sum, value) => sum + value, 0)} {copy('quickGameCommanderDamage')}</Text></View>
          <Text style={styles.recapLife}>{player.life}</Text>
        </View>)}
        <Button label={copy('quickGameExport')} icon="share-outline" onPress={() => void Share.share({ title: 'Tracker & Analytics', message: recapText })} />
        <Button label={copy('quickGameNew')} variant="outline" onPress={() => {
          setRecap(null);
          setState(null);
          void AsyncStorage.removeItem(STORAGE_KEY);
        }} />
        <Button label={copy('quickGameExit')} variant="ghost" onPress={() => {
          setRecap(null);
          setState(null);
          void AsyncStorage.removeItem(STORAGE_KEY);
          router.back();
        }} />
      </ScrollView>
    </Screen>;
  }

  if (!state) {
    return <Screen background="solid">
      <ScrollView contentContainerStyle={styles.setupContent}>
        <Text style={styles.title}>{copy('quickGame')}</Text>
        <Text style={styles.subtitle}>{copy('quickGameSetupHint')}</Text>
        <View style={styles.formatRow}>
          {(['commander', 'classic'] as Format[]).map((value) => <Pressable key={value} onPress={() => setFormat(value)} style={[styles.formatCard, format === value && styles.formatCardActive]}><Text style={styles.formatTitle}>{value === 'commander' ? 'Commander · 40' : `${copy('classicMagic')} · 20`}</Text></Pressable>)}
        </View>
        <View style={styles.countRow}><Text style={styles.sectionTitle}>{copy('players')}</Text><Button label="−" variant="outline" onPress={() => setPlayerCount(Math.max(2, playerCount - 1))} /><Text style={styles.count}>{playerCount}</Text><Button label="+" variant="outline" onPress={() => setPlayerCount(Math.min(6, playerCount + 1))} /></View>
        {setup.slice(0, playerCount).map((player, index) => <View key={index} style={styles.playerCard}>
          <Input label={`Player ${index + 1}`} value={player.name} onChangeText={(name) => setSetup((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, name } : item))} />
          {format === 'commander' ? <><Input label={copy('searchCommander')} value={player.commander} onChangeText={(value) => void searchCommander(index, value)} />{searchIndex === index && searchResults.length ? <View style={styles.searchResults}>{searchResults.slice(0, 8).map((result) => <Pressable key={result.id} style={styles.searchResult} onPress={() => { setSetup((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, commander: result.name, commanderImage: result.imageUrl } : item)); setSearchResults([]); }}><DeckImage uri={result.imageUrl} alt={result.name} style={styles.searchImage} containerStyle={styles.searchImageWrap} /><Text style={styles.searchName} numberOfLines={2}>{result.name}</Text></Pressable>)}</View> : null}</> : null}
          <View style={styles.colorRow}>{CARD_COLORS.map((color) => <Pressable key={color} onPress={() => setSetup((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, color } : item))} style={[styles.color, { backgroundColor: color }, player.color === color && styles.colorActive]} />)}</View>
        </View>)}
        <Button label={copy('startGame')} icon="play" testID="counter-start-game" onPress={() => void start()} />
        <Button label={copy('back')} variant="ghost" onPress={() => router.back()} />
      </ScrollView>
    </Screen>;
  }

  const activePlayers = state.players.filter((player) => !player.isEliminated);
  return <View testID="counter-arena" style={styles.game}>
    <StatusBar hidden />
    <TableArena
      players={state.players}
      startedAt={startedAt}
      randomHighlight={highlight}
      startingPlayerKey={null}
      startingHighlight={null}
      startingDirection={null}
      layoutVariant="classic"
      commanderMode={format === 'commander'}
      damagePulse={{}}
      activePlayers={activePlayers}
      labels={{
        damageLife: copy('liveGameDamageLife'),
        damageCommander: copy('liveGameDamageCommander'),
        damageInfect: format === 'commander' ? copy('liveGameDamageInfect') : 'Poison',
        randomAll: copy('liveGameRandomAll'),
        randomOpponents: copy('liveGameRandomOpponents'),
        selectActivePlayer: copy('liveGameSelectActivePlayer'),
        dragDamage: copy('liveGameDragDamage'),
        dropDamage: copy('liveGameDropDamage'),
        damageConfirmTitle: copy('liveGameDamageConfirmTitle'),
        damageAmount: copy('liveGameDamageAmount'),
        lifeDamage: copy('liveGameLifeDamage'),
        commanderDamage: copy('liveGameCommanderDamage'),
        applyDamage: copy('liveGameApplyDamage'),
        cancel: copy('cancel'),
        commanderDamageMeta: copy('liveGameCommanderDamage'),
        infect: format === 'commander' ? copy('liveGameInfect') : 'Poison',
        eliminated: copy('liveGameEliminated'),
        revive: copy('liveGameRevive'),
        selected: copy('liveGameSelected'),
        ko: copy('liveGameKo'),
        endGame: copy('liveGameEnd'),
        startingPlayer: copy('liveGameStartingPlayer'),
        clockwise: copy('liveGameClockwise'),
        counterclockwise: copy('liveGameCounterclockwise'),
        damageReceived: copy('liveGameDamageReceived'),
        undo: copy('liveGameUndo'),
        redo: copy('liveGameRedo'),
        thisPlayer: copy('liveGameThisPlayer'),
        eachOpponent: copy('liveGameEachOpponent'),
        everyone: copy('liveGameEveryone'),
        drain: copy('liveGameDrain'),
        drainHint: copy('liveGameDrainHint'),
        dieOrCoin: copy('dieOrCoin'),
        coin: copy('coin'),
        heads: copy('heads'),
        tails: copy('tails'),
      }}
      onBack={() => router.back()}
      canUndo={history.length > 0}
      onUndo={() => {
        const previous = history.at(-1);
        if (!previous) return;
        setRedo((current) => [...current, state]);
        setState(previous);
        setHistory((current) => current.slice(0, -1));
      }}
      canRedo={redo.length > 0}
      onRedo={() => {
        const next = redo.at(-1);
        if (!next) return;
        setHistory((current) => [...current, state]);
        setState(next);
        setRedo((current) => current.slice(0, -1));
      }}
      syncStatus="offline"
      syncLabel="Locale"
      pendingSyncCount={0}
      syncError={null}
      onRetrySync={() => undefined}
      onEndGame={() => {
        setRecap(state);
        setRecapEndedAt(Date.now());
      }}
      onAdjust={(key, delta) => mutate({ type: 'adjust', targetKey: key, amount: -delta, mode: 'life' })}
      onApplyDragDamage={({ sourceKey, targetKey, amount, mode, scope, drain }) => {
        const effectiveScope = drain && scope === 'all_players' ? 'opponents' : scope;
        mutate(effectiveScope === 'single'
          ? { type: 'adjust', sourceKey, targetKey, amount, mode, drain }
          : { type: 'adjust_many', sourceKey, amount, scope: effectiveScope, mode: mode === 'infect' ? 'infect' : 'life', drain });
      }}
      onEliminate={(key) => mutate({ type: 'eliminate', targetKey: key, eliminatedAt: new Date().toISOString() })}
      onRevive={(key) => mutate({ type: 'revive', targetKey: key, startingLife: format === 'commander' ? 40 : 20 })}
      onPickRandom={(pool) => {
        const choices = pool?.length ? pool : activePlayers.map((player) => player.participantKey);
        const picked = choices[Math.floor(Math.random() * choices.length)] ?? null;
        setHighlight(picked);
        setTimeout(() => setHighlight(null), 1600);
      }}
      onAdjustCounter={(key, counter, amount) => mutate({ type: 'adjust_counter', targetKey: key, counter, amount })}
      onSetEmblem={(key, emblem, active) => mutate({ type: 'set_emblem', targetKey: key, emblem, active })}
    />
  </View>;
}

const styles = StyleSheet.create({
  setupContent: { padding: spacing.lg, gap: spacing.md },
  title: { color: colors.foreground, fontSize: 34, fontWeight: '900' },
  subtitle: { color: colors.muted, marginTop: -8 },
  formatRow: { flexDirection: 'row', gap: spacing.sm },
  formatCard: { flex: 1, minHeight: 70, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardInset, alignItems: 'center', justifyContent: 'center', padding: spacing.sm },
  formatCardActive: { borderColor: colors.primary, backgroundColor: colors.selectionTintStrong },
  formatTitle: { color: colors.foreground, fontWeight: '800', textAlign: 'center' },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionTitle: { flex: 1, color: colors.foreground, fontSize: 16, fontWeight: '800' },
  count: { width: 32, color: colors.foreground, fontSize: 24, fontWeight: '900', textAlign: 'center' },
  playerCard: { gap: spacing.sm, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardInset, padding: spacing.md },
  searchResults: { maxHeight: 260, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  searchResult: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.xs, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  searchImage: { width: 38, height: 52 },
  searchImageWrap: { width: 38, height: 52, borderRadius: 5 },
  searchName: { flex: 1, color: colors.foreground, fontWeight: '700' },
  colorRow: { flexDirection: 'row', gap: spacing.xs },
  color: { flex: 1, height: 28, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  colorActive: { borderWidth: 3, borderColor: '#a7e3ac' },
  game: { flex: 1, backgroundColor: colors.black },
  recapPlayer: { minHeight: 78, flexDirection: 'row', alignItems: 'center', overflow: 'hidden', borderRadius: radii.lg, backgroundColor: colors.cardInset },
  recapAccent: { alignSelf: 'stretch', width: 7 },
  recapCopy: { flex: 1, minWidth: 0, padding: spacing.md },
  recapName: { color: colors.foreground, fontSize: 17, fontWeight: '900' },
  recapCommander: { color: colors.muted, fontSize: 12 },
  recapMeta: { color: colors.primaryMuted, fontSize: 11, marginTop: 3 },
  recapLife: { color: colors.foreground, fontSize: 38, fontWeight: '900', paddingHorizontal: spacing.lg },
});
