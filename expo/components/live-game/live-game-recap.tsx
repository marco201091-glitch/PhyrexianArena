import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { buildLiveGameRecap } from '@/lib/live-game-recap';
import { buildLiveGameRecapShareSvg } from '@/lib/live-game-recap-share';
import type { LiveGameRecord } from '@/lib/live-game';
import { colors, radii, spacing } from '@/constants/theme';
import { useLanguage } from '@/contexts/language-context';

const PLAYER_COLORS = ['#72d17b', '#22d3ee', '#fb7185', '#fbbf24', '#4ade80', '#f472b6'];

export function LiveGameRecapView({
  record,
  labels,
}: {
  record: LiveGameRecord;
  labels: { timeline: string; highlights: string; empty: string };
}) {
  const { language } = useLanguage();
  const recap = buildLiveGameRecap(record);
  const duration = recap.durationSeconds == null ? '—' : `${Math.floor(recap.durationSeconds / 60)}:${String(recap.durationSeconds % 60).padStart(2, '0')}`;
  const shareRecap = async () => {
    if (!FileSystem.cacheDirectory || !await Sharing.isAvailableAsync()) return;
    const safeId = record.id.replace(/[^a-zA-Z0-9_-]/g, '-');
    const path = `${FileSystem.cacheDirectory}mtg-game-recap-${safeId}.svg`;
    await FileSystem.writeAsStringAsync(path, buildLiveGameRecapShareSvg(record, language), { encoding: FileSystem.EncodingType.UTF8 });
    await Sharing.shareAsync(path, { mimeType: 'image/svg+xml', dialogTitle: language === 'it' ? 'Condividi riepilogo' : 'Share recap' });
    await FileSystem.deleteAsync(path, { idempotent: true }).catch(() => undefined);
  };
  return <View style={styles.root}>
    <View style={styles.summaryRow}>
      <Text style={styles.summaryChip}>⏱ {duration}</Text>
      {recap.startingPlayerName ? <Text style={styles.summaryChip}>① {recap.startingPlayerName} · {recap.startingDirection === 'clockwise' ? '↻' : '↺'}</Text> : null}
      <Pressable onPress={() => void shareRecap()} accessibilityRole="button" accessibilityLabel={language === 'it' ? 'Condividi riepilogo' : 'Share recap'} style={styles.shareButton}><Ionicons name="share-social-outline" size={15} color="#a7f3d0" /></Pressable>
    </View>
    <Text style={styles.title}>{labels.timeline}</Text>
    {recap.players.map((player, index) => (
      <View key={player.participantKey} style={styles.player}>
        <View style={styles.playerHeader}>
          <View style={[styles.dot, { backgroundColor: PLAYER_COLORS[index % PLAYER_COLORS.length] }]} />
          <Text style={styles.name} numberOfLines={1}>{player.displayName}</Text>
          <View style={styles.finalMetrics}>
            <Text style={[styles.finalLife, { color: PLAYER_COLORS[index % PLAYER_COLORS.length] }]}>{player.finalLife}</Text>
            {player.finalInfect > 0 ? <Text style={styles.infect}>☠ {player.finalInfect}</Text> : null}
          </View>
        </View>
        <Text style={styles.commander} numberOfLines={1}>{player.commander}</Text>
        <View style={styles.metrics}>
          {player.damageDealt > 0 ? <Text style={styles.metric}>⚔ {player.damageDealt}</Text> : null}
          {player.lifeGained > 0 ? <Text style={styles.metric}>♥ +{player.lifeGained}</Text> : null}
          {player.eliminationsCaused > 0 ? <Text style={styles.metric}>☠ {player.eliminationsCaused}</Text> : null}
          {player.commanderDamageDealt > 0 ? <Text style={styles.metric}>CMD ⚔ {player.commanderDamageDealt}</Text> : null}
          {player.infectDealt > 0 ? <Text style={styles.metric}>INF ⚔ {player.infectDealt}</Text> : null}
          {player.corrections > 0 ? <Text style={styles.correctionMetric}>↶ {player.corrections}</Text> : null}
          {player.events > 0 ? <Text style={styles.metric}>• {player.events}</Text> : null}
        </View>
      </View>
    ))}
    <Text style={[styles.title, styles.highlightsTitle]}>{labels.highlights}</Text>
    {recap.highlights.length ? <View style={styles.highlights}>
      {recap.highlights.map((event) => {
        const target = recap.players.find((player) => player.participantKey === event.targetKey);
        const correction = event.isCorrection || event.type === 'correction';
        return <View key={event.id} style={[styles.highlight, correction && styles.correctionHighlight]}><Text style={[styles.highlightText, correction && styles.correctionHighlightText]}>{target?.displayName ?? event.targetKey} · {correction ? (language === 'it' ? 'correzione' : 'correction') : event.type.replace('_', ' ')}</Text></View>;
      })}
    </View> : <Text style={styles.empty}>{labels.empty}</Text>}
  </View>;
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm, borderWidth: 1, borderColor: 'rgba(34,211,238,0.2)', borderRadius: radii.lg, backgroundColor: 'rgba(34,211,238,0.05)', padding: spacing.md },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs },
  summaryChip: { color: colors.muted, fontSize: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 8, paddingVertical: 5 },
  shareButton: { marginLeft: 'auto', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(52,211,153,0.35)', backgroundColor: 'rgba(16,185,129,0.12)' },
  title: { color: '#a5f3fc', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.2 },
  player: { gap: 3, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, paddingBottom: spacing.sm },
  playerHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { width: 8, height: 8, borderRadius: 4 },
  name: { flex: 1, color: colors.foreground, fontSize: 12, fontWeight: '800' },
  finalLife: { fontSize: 17, fontWeight: '900' },
  finalMetrics: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  infect: { color: colors.success, fontSize: 11, fontWeight: '800' },
  commander: { color: colors.muted, fontSize: 10 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metric: { color: colors.muted, fontSize: 9, fontWeight: '700' },
  correctionMetric: { color: '#fcd34d', fontSize: 9, fontWeight: '800' },
  highlightsTitle: { color: '#ddd6fe', marginTop: spacing.xs },
  highlights: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  highlight: { borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.surfaceMuted, paddingHorizontal: spacing.sm, paddingVertical: 5 },
  highlightText: { color: colors.muted, fontSize: 10 },
  correctionHighlight: { borderColor: 'rgba(251,191,36,0.35)', backgroundColor: 'rgba(245,158,11,0.1)' },
  correctionHighlightText: { color: '#fcd34d' },
  empty: { color: colors.muted, fontSize: 11 },
});
