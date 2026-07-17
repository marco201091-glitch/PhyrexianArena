import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TableArena } from '@/components/live-game/table-arena';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { colors, radii, spacing } from '@/constants/theme';
import {
  applyLiveGameMutation,
  createLiveGamePlayer,
  createLiveGameSummary,
  parseLiveGameState,
  type LiveGameMutation,
  type LiveGameState,
} from '@/lib/live-game';
import type { ParticipantKey } from '@/lib/participant-keys';

const STORAGE_KEY = 'phyrexian:standalone-counter:v1';
const CARD_COLORS = ['#18181b', '#7f1d1d', '#1e3a8a', '#14532d', '#713f12', '#581c87'];
type Format = 'commander' | 'classic';
type SetupPlayer = { name: string; commander: string; color: string };

export default function CounterScreen() {
  const router = useRouter();
  const [format, setFormat] = useState<Format>('commander');
  const [playerCount, setPlayerCount] = useState(4);
  const [setup, setSetup] = useState<SetupPlayer[]>(() => Array.from({ length: 6 }, (_, index) => ({
    name: `Player ${index + 1}`,
    commander: '',
    color: CARD_COLORS[index],
  })));
  const [state, setState] = useState<LiveGameState | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [history, setHistory] = useState<LiveGameState[]>([]);
  const [redo, setRedo] = useState<LiveGameState[]>([]);
  const [highlight, setHighlight] = useState<ParticipantKey | null>(null);
  const [recap, setRecap] = useState<LiveGameState | null>(null);
  const [recapEndedAt, setRecapEndedAt] = useState(0);

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

  const mutate = (mutation: LiveGameMutation) => {
    if (!state) return;
    setHistory((current) => [...current.slice(-29), state]);
    setRedo([]);
    setState(applyLiveGameMutation(state, {
      ...mutation,
      eventId: globalThis.crypto.randomUUID(),
      occurredAt: new Date().toISOString(),
    }));
  };

  const start = () => {
    const keys = Array.from({ length: playerCount }, (_, index) => `guest:local-${index + 1}` as ParticipantKey);
    const players = keys.map((participantKey, index) => createLiveGamePlayer({
      slot: index,
      participantKey,
      deckId: `local-${index + 1}`,
      displayName: setup[index].name.trim() || `Player ${index + 1}`,
      commander: format === 'commander' ? setup[index].commander.trim() || 'Commander' : 'Magic',
      commanderImage: null,
      backgroundColor: setup[index].color,
      startingLife: format === 'commander' ? 40 : 20,
      allParticipantKeys: keys,
    }));
    setState({ version: 0, players, events: [], summary: createLiveGameSummary(), layoutVariant: 'classic' });
    setStartedAt(new Date().toISOString());
    setRecap(null);
    setRecapEndedAt(0);
  };

  if (recap) {
    const durationMinutes = startedAt
      ? Math.max(0, Math.round((recapEndedAt - new Date(startedAt).getTime()) / 60000))
      : 0;
    const recapText = [
      'Phyrexian Arena · Riepilogo partita',
      `Formato: ${format === 'commander' ? 'Commander' : 'Magic classico'}`,
      `Durata: ${durationMinutes} min`,
      '',
      ...recap.players.map((player) => `${player.displayName}: ${player.life} vite${player.infect ? ` · ${player.infect} poison` : ''}`),
    ].join('\n');
    return <Screen background="solid">
      <ScrollView contentContainerStyle={styles.setupContent}>
        <Text style={styles.title}>Riepilogo partita</Text>
        <Text style={styles.subtitle}>{format === 'commander' ? 'Commander' : 'Magic classico'} · {durationMinutes} min</Text>
        {recap.players.map((player) => <View key={player.participantKey} style={styles.recapPlayer}>
          <View style={[styles.recapAccent, { backgroundColor: player.backgroundColor ?? colors.primary }]} />
          <View style={styles.recapCopy}><Text style={styles.recapName}>{player.displayName}</Text><Text style={styles.subtitle}>{player.commander}</Text></View>
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
        <Text style={styles.title}>Segnapunti</Text>
        <Text style={styles.subtitle}>Offline · nessun account richiesto</Text>
        <View style={styles.formatRow}>
          {(['commander', 'classic'] as Format[]).map((value) => <Pressable key={value} onPress={() => setFormat(value)} style={[styles.formatCard, format === value && styles.formatCardActive]}><Text style={styles.formatTitle}>{value === 'commander' ? 'Commander · 40' : 'Magic classico · 20'}</Text></Pressable>)}
        </View>
        <View style={styles.countRow}><Text style={styles.sectionTitle}>Giocatori</Text><Button label="−" variant="outline" onPress={() => setPlayerCount(Math.max(2, playerCount - 1))} /><Text style={styles.count}>{playerCount}</Text><Button label="+" variant="outline" onPress={() => setPlayerCount(Math.min(6, playerCount + 1))} /></View>
        {setup.slice(0, playerCount).map((player, index) => <View key={index} style={styles.playerCard}>
          <Input label={`Player ${index + 1}`} value={player.name} onChangeText={(name) => setSetup((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, name } : item))} />
          {format === 'commander' ? <Input label="Comandante (facoltativo)" value={player.commander} onChangeText={(commander) => setSetup((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, commander } : item))} /> : null}
          <View style={styles.colorRow}>{CARD_COLORS.map((color) => <Pressable key={color} onPress={() => setSetup((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, color } : item))} style={[styles.color, { backgroundColor: color }, player.color === color && styles.colorActive]} />)}</View>
        </View>)}
        <Button label="Avvia partita" icon="play" onPress={start} />
        <Button label="Indietro" variant="ghost" onPress={() => router.back()} />
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
        damageLife: 'Vite', damageCommander: 'Commander', damageInfect: format === 'commander' ? 'Infect' : 'Poison',
        randomAll: 'Giocatore casuale', randomOpponents: 'Avversario casuale', selectActivePlayer: 'Scegli giocatore',
        dragDamage: 'Trascina danno', dropDamage: 'Rilascia', damageConfirmTitle: 'Assegna danno', damageAmount: 'Danno',
        lifeDamage: 'Normale', commanderDamage: 'Commander', applyDamage: 'Applica', cancel: 'Annulla',
        commanderDamageMeta: 'Danni Commander', infect: format === 'commander' ? 'Infect' : 'Poison', eliminated: 'Eliminato',
        revive: 'Rianima', selected: 'Scelto', ko: 'Elimina', endGame: 'Termina', startingPlayer: 'Inizia',
        clockwise: 'Orario', counterclockwise: 'Antiorario', damageReceived: 'Segnalini', undo: 'Annulla',
        redo: 'Ripeti', thisPlayer: 'Questo', eachOpponent: 'Ogni avversario', everyone: 'Tutti',
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
  colorRow: { flexDirection: 'row', gap: spacing.xs },
  color: { flex: 1, height: 28, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  colorActive: { borderWidth: 3, borderColor: '#c4b5fd' },
  game: { flex: 1, backgroundColor: colors.black },
  recapPlayer: { minHeight: 78, flexDirection: 'row', alignItems: 'center', overflow: 'hidden', borderRadius: radii.lg, backgroundColor: colors.cardInset },
  recapAccent: { alignSelf: 'stretch', width: 7 },
  recapCopy: { flex: 1, minWidth: 0, padding: spacing.md },
  recapName: { color: colors.foreground, fontSize: 17, fontWeight: '900' },
  recapLife: { color: colors.foreground, fontSize: 38, fontWeight: '900', paddingHorizontal: spacing.lg },
});
