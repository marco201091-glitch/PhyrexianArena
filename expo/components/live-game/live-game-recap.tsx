import { StyleSheet, Text, View } from 'react-native';
import { buildLiveGameRecap } from '@/lib/live-game-recap';
import type { LiveGameRecord } from '@/lib/live-game';
import { colors, radii, spacing } from '@/constants/theme';

const PLAYER_COLORS = ['#a78bfa', '#22d3ee', '#fb7185', '#fbbf24', '#4ade80', '#f472b6'];

export function LiveGameRecapView({
  record,
  labels,
}: {
  record: LiveGameRecord;
  labels: { timeline: string; highlights: string; empty: string };
}) {
  const recap = buildLiveGameRecap(record);
  return <View style={styles.root}>
    <Text style={styles.title}>{labels.timeline}</Text>
    {recap.players.map((player, index) => (
      <View key={player.participantKey} style={styles.player}>
        <View style={styles.playerHeader}>
          <View style={[styles.dot, { backgroundColor: PLAYER_COLORS[index % PLAYER_COLORS.length] }]} />
          <Text style={styles.name} numberOfLines={1}>{player.displayName}</Text>
          <Text style={[styles.finalLife, { color: PLAYER_COLORS[index % PLAYER_COLORS.length] }]}>{player.finalLife}</Text>
        </View>
        <Text style={styles.commander} numberOfLines={1}>{player.commander}</Text>
        <View style={styles.timeline}>
          {player.timeline.map((point, pointIndex) => (
            <View key={`${point.occurredAt}:${pointIndex}`} style={styles.pointWrap}>
              <View style={[styles.point, { borderColor: PLAYER_COLORS[index % PLAYER_COLORS.length] }]}>
                <Text style={styles.pointText}>{point.life}</Text>
              </View>
              {pointIndex < player.timeline.length - 1 ? <Text style={styles.arrow}>→</Text> : null}
            </View>
          ))}
        </View>
      </View>
    ))}
    <Text style={[styles.title, styles.highlightsTitle]}>{labels.highlights}</Text>
    {recap.highlights.length ? <View style={styles.highlights}>
      {recap.highlights.map((event) => {
        const target = recap.players.find((player) => player.participantKey === event.targetKey);
        return <View key={event.id} style={styles.highlight}><Text style={styles.highlightText}>{target?.displayName ?? event.targetKey} · {event.type.replace('_', ' ')}</Text></View>;
      })}
    </View> : <Text style={styles.empty}>{labels.empty}</Text>}
  </View>;
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm, borderWidth: 1, borderColor: 'rgba(34,211,238,0.2)', borderRadius: radii.lg, backgroundColor: 'rgba(34,211,238,0.05)', padding: spacing.md },
  title: { color: '#a5f3fc', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.2 },
  player: { gap: 3, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, paddingBottom: spacing.sm },
  playerHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { width: 8, height: 8, borderRadius: 4 },
  name: { flex: 1, color: colors.foreground, fontSize: 12, fontWeight: '800' },
  finalLife: { fontSize: 17, fontWeight: '900' },
  commander: { color: colors.muted, fontSize: 10 },
  timeline: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 3, marginTop: 4 },
  pointWrap: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  point: { minWidth: 28, height: 25, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 13, backgroundColor: colors.surfaceMuted, paddingHorizontal: 6 },
  pointText: { color: colors.foreground, fontSize: 10, fontWeight: '800' },
  arrow: { color: colors.muted, fontSize: 10 },
  highlightsTitle: { color: '#ddd6fe', marginTop: spacing.xs },
  highlights: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  highlight: { borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.surfaceMuted, paddingHorizontal: spacing.sm, paddingVertical: 5 },
  highlightText: { color: colors.muted, fontSize: 10 },
  empty: { color: colors.muted, fontSize: 11 },
});
