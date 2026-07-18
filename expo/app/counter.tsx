import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { useKeepAwake } from 'expo-keep-awake';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TableArena } from '@/components/live-game/table-arena';
import { DeckImage } from '@/components/deck/deck-image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { QrCode } from '@/components/ui/qr-code';
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
import { getApiBaseUrl, getSiteUrl } from '@/lib/env';
import { subscribePublicCounterRealtime } from '@/lib/guest-realtime';
import { buildCounterGuestInviteUrl } from '@/lib/invite-links';
import { useLanguage } from '@/contexts/language-context';

const STORAGE_KEY = 'phyrexian:standalone-counter:v1';
const CARD_COLORS = ['#18181b', '#7f1d1d', '#1e3a8a', '#14532d', '#713f12', '#581c87'];
type Format = 'commander' | 'classic';
type SetupPlayer = { name: string; commander: string; commanderImage: string | null; color: string };
type OnlineGuest = { id: string; display_name: string; commander: string; commander_image: string | null; ready: boolean };
type OnlineSession = { hostToken: string; inviteToken: string; realtimeTopic: string; guests: OnlineGuest[] };
const ONLINE_STORAGE_KEY = 'phyrexian:standalone-counter-online:v1';

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
  const [guestsEnabled, setGuestsEnabled] = useState(false);
  const [online, setOnline] = useState<OnlineSession | null>(null);
  const onlineHostToken = online?.hostToken;

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
    void AsyncStorage.getItem(ONLINE_STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const saved = JSON.parse(raw) as OnlineSession;
        if (saved.hostToken) {
          setOnline(saved);
          setGuestsEnabled(true);
        }
      } catch { /* Ignore invalid recovery data. */ }
    });
  }, []);

  const refreshOnline = async (hostToken: string) => {
    const response = await fetch(`${getApiBaseUrl()}/api/public-counter-session`, { headers: { Authorization: `Bearer ${hostToken}` } });
    if (!response.ok) return;
    const payload = await response.json();
    setOnline((current) => current ? { ...current, realtimeTopic: payload.session.realtimeTopic, guests: payload.guests ?? [] } : current);
    if (payload.session.state) setState(parseLiveGameState(payload.session.state));
  };

  useEffect(() => {
    if (online) void AsyncStorage.setItem(ONLINE_STORAGE_KEY, JSON.stringify(online));
  }, [online]);

  useEffect(() => {
    const hostToken = onlineHostToken;
    if (!hostToken) return;
    void refreshOnline(hostToken);
    const timer = setInterval(() => void refreshOnline(hostToken), state ? 15_000 : 2_000);
    return () => clearInterval(timer);
  }, [onlineHostToken, state]);

  useEffect(() => {
    if (!online?.realtimeTopic || !onlineHostToken) return;
    return subscribePublicCounterRealtime(online.realtimeTopic, () => void refreshOnline(onlineHostToken));
  }, [online?.realtimeTopic, onlineHostToken]);

  useEffect(() => {
    if (!state || !startedAt) return;
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ format, state, startedAt }));
  }, [format, startedAt, state]);

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
    if (online) void fetch(`${getApiBaseUrl()}/api/public-counter-session`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'mutate', sessionToken: online.hostToken, mutation }) }).then(() => refreshOnline(online.hostToken));
  };

  const start = async () => {
    const onlineGuests = online?.guests.slice(0, Math.max(0, 6 - playerCount)) ?? [];
    const keys = [...Array.from({ length: playerCount }, (_, index) => `guest:local-${index + 1}` as ParticipantKey), ...onlineGuests.map((guest) => `guest:public-${guest.id}` as ParticipantKey)];
    const players = keys.map((participantKey, index) => createLiveGamePlayer({
      slot: index,
      participantKey,
      deckId: `local-${index + 1}`,
      displayName: index < playerCount ? setup[index].name.trim() || `Player ${index + 1}` : onlineGuests[index - playerCount].display_name,
      commander: format === 'commander' ? (index < playerCount ? setup[index].commander.trim() || 'Commander' : onlineGuests[index - playerCount].commander) : 'Magic',
      commanderImage: format === 'commander' ? (index < playerCount ? setup[index].commanderImage : onlineGuests[index - playerCount].commander_image) : null,
      backgroundColor: index < playerCount ? setup[index].color : CARD_COLORS[index],
      startingLife: format === 'commander' ? 40 : 20,
      allParticipantKeys: keys,
    }));
    const nextState = { version: 0, players, events: [], summary: createLiveGameSummary(), layoutVariant: 'classic' } satisfies LiveGameState;
    if (online) {
      const response = await fetch(`${getApiBaseUrl()}/api/public-counter-session`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'start', sessionToken: online.hostToken, state: nextState }) });
      if (!response.ok) return;
    }
    setState(nextState);
    setStartedAt(new Date().toISOString());
    setRecap(null);
    setRecapEndedAt(0);
  };

  const toggleGuests = async (enabled: boolean) => {
    if (!enabled) {
      if (online) await fetch(`${getApiBaseUrl()}/api/public-counter-session`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionToken: online.hostToken }) });
      await AsyncStorage.removeItem(ONLINE_STORAGE_KEY);
      setOnline(null);
      setGuestsEnabled(false);
      return;
    }
    const response = await fetch(`${getApiBaseUrl()}/api/public-counter-session`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', format }) });
    if (!response.ok) return;
    const payload = await response.json();
    setOnline({ hostToken: payload.hostToken, inviteToken: payload.inviteToken, realtimeTopic: payload.realtimeTopic, guests: [] });
    setGuestsEnabled(true);
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
    const recapText = [
      'Phyrexian Arena · Riepilogo partita',
      `Formato: ${format === 'commander' ? 'Commander' : 'Magic classico'}`,
      `Durata: ${durationMinutes} min`,
      `Vincitore: ${winner?.displayName ?? 'Non determinato'}`,
      '',
      ...recap.players.map((player) => `${player.displayName}: ${player.life} vite · ${player.infect} poison · ${Object.values(player.commanderDamageFrom).reduce((sum, value) => sum + value, 0)} danni commander`),
    ].join('\n');
    return <Screen background="solid">
      <ScrollView contentContainerStyle={styles.setupContent}>
        <Text style={styles.title}>Riepilogo partita</Text>
        <Text style={styles.subtitle}>{format === 'commander' ? 'Commander' : 'Magic classico'} · {durationMinutes} min · {winner ? `Vince ${winner.displayName}` : 'Vincitore non determinato'}</Text>
        {recap.players.map((player) => <View key={player.participantKey} style={styles.recapPlayer}>
          <View style={[styles.recapAccent, { backgroundColor: player.backgroundColor ?? colors.primary }]} />
          <View style={styles.recapCopy}><Text style={styles.recapName} numberOfLines={1}>{player.displayName}</Text><Text style={styles.recapCommander} numberOfLines={1}>{player.commander}</Text><Text style={styles.recapMeta}>{player.infect} poison · {Object.values(player.commanderDamageFrom).reduce((sum, value) => sum + value, 0)} danni commander</Text></View>
          <Text style={styles.recapLife}>{player.life}</Text>
        </View>)}
        <Button label="Esporta riepilogo" icon="share-outline" onPress={() => void Share.share({ title: 'Phyrexian Arena', message: recapText })} />
        <Button label="Nuova partita" variant="outline" onPress={() => {
          setRecap(null);
          setState(null);
          void AsyncStorage.removeItem(STORAGE_KEY);
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
        <View style={styles.guestPanel}><View style={styles.guestToggle}><View style={styles.guestCopy}><Text style={styles.sectionTitle}>{copy('guestsQuestion')}</Text><Text style={styles.subtitle}>{guestsEnabled ? copy('temporaryOnlineLobby') : copy('offlineSingleDevice')}</Text></View><Switch value={guestsEnabled} onValueChange={(value) => void toggleGuests(value)} /></View>{online ? <><View style={styles.qr}><QrCode value={buildCounterGuestInviteUrl(getSiteUrl(), online.inviteToken)} size={224} label={copy('gameInviteQr')} /></View><Text style={styles.qrHint}>Guest: {online.guests.length} · {copy('readyGuests')} {online.guests.filter((guest) => guest.ready).length}</Text><Button label={copy('rotateInvite')} variant="outline" onPress={async () => { const response = await fetch(`${getApiBaseUrl()}/api/public-counter-session`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'rotate', sessionToken: online.hostToken }) }); const payload = await response.json(); if (response.ok) setOnline((current) => current ? { ...current, inviteToken: payload.inviteToken } : current); }} />{online.guests.map((guest) => <View key={guest.id} style={styles.guestRow}><Text style={styles.guestName}>{guest.ready ? '✓' : '○'} {guest.display_name} · {guest.commander}</Text><Pressable onPress={async () => { await fetch(`${getApiBaseUrl()}/api/public-counter-session`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'remove', sessionToken: online.hostToken, guestId: guest.id }) }); await refreshOnline(online.hostToken); }}><Text style={styles.removeGuest}>{copy('remove')}</Text></Pressable></View>)}</> : null}</View>
        <Button label={copy('startGame')} icon="play" disabled={Boolean(online && (playerCount + online.guests.length > 6 || online.guests.some((guest) => !guest.ready)))} onPress={() => void start()} />
        <Button label={copy('back')} variant="ghost" onPress={() => router.back()} />
      </ScrollView>
    </Screen>;
  }

  const activePlayers = state.players.filter((player) => !player.isEliminated);
  return <View style={styles.game}>
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
      onApplyDragDamage={({ sourceKey, targetKey, amount, mode, scope }) => mutate(scope === 'single'
        ? { type: 'adjust', sourceKey, targetKey, amount, mode }
        : { type: 'adjust_many', sourceKey, amount, scope })}
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
  colorActive: { borderWidth: 3, borderColor: '#c4b5fd' },
  guestPanel: { gap: spacing.sm, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardInset, padding: spacing.md },
  guestToggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  guestCopy: { flex: 1 },
  qr: { alignSelf: 'center' },
  qrHint: { color: colors.muted, textAlign: 'center' },
  guestName: { color: colors.foreground, fontWeight: '600' },
  guestRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  removeGuest: { color: colors.destructive, fontWeight: '700' },
  game: { flex: 1, backgroundColor: colors.black },
  recapPlayer: { minHeight: 78, flexDirection: 'row', alignItems: 'center', overflow: 'hidden', borderRadius: radii.lg, backgroundColor: colors.cardInset },
  recapAccent: { alignSelf: 'stretch', width: 7 },
  recapCopy: { flex: 1, minWidth: 0, padding: spacing.md },
  recapName: { color: colors.foreground, fontSize: 17, fontWeight: '900' },
  recapCommander: { color: colors.muted, fontSize: 12 },
  recapMeta: { color: colors.primaryMuted, fontSize: 11, marginTop: 3 },
  recapLife: { color: colors.foreground, fontSize: 38, fontWeight: '900', paddingHorizontal: spacing.lg },
});
