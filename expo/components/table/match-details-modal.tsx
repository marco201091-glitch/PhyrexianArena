import { ActivityIndicator, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { LiveGameRecapView } from '@/components/live-game/live-game-recap';
import { CompactDeckCard } from '@/components/deck/compact-deck-card';
import { Modal } from '@/components/ui/modal';
import { ModalHeader } from '@/components/ui/modal-header';
import { PhyrexianPanel } from '@/components/ui/phyrexian-panel';
import { colors, spacing } from '@/constants/theme';
import { getParticipantDeckSnapshot, getParticipantDisplayName } from '@/lib/arena-participants';
import { formatGameDuration } from '@/lib/live-game-duration';
import { buildHistoricalLiveGameRecord } from '@/lib/live-game-recap';
import type { ArenaMatch } from '@/lib/types/arena';
import type { LiveGameRecord } from '@/lib/live-game';

type Props = { visible: boolean; match: ArenaMatch | null; liveGame: LiveGameRecord | null; recapLoading: boolean; onClose: () => void; labels: Record<'title' | 'duration' | 'damageDealt' | 'lifeLost' | 'lifeGained' | 'commander' | 'infect' | 'started' | 'timeline' | 'highlights' | 'empty' | 'recap', string> };

export function MatchDetailsModal({ visible, match, liveGame, recapLoading, onClose, labels }: Props) {
  const { width } = useWindowDimensions();
  if (!match) return null;
  const phoneLayout = width < 600;
  const recapRecord = liveGame ?? (match.tracking_version != null
    ? buildHistoricalLiveGameRecord(match)
    : null);
  return <Modal visible={visible} onClose={onClose} presentation="dialog" maxWidth={620}>
    <ModalHeader title={labels.title} subtitle={match.duration_seconds != null ? `${labels.duration}: ${formatGameDuration(match.duration_seconds)}` : undefined} icon="stats-chart-outline" onClose={onClose} />
    <View style={styles.list}>
      {recapLoading ? <View style={styles.recapLoading}><ActivityIndicator color={colors.primaryMuted} /><Text style={styles.meta}>{labels.recap}</Text></View> : null}
      {recapRecord ? <LiveGameRecapView record={recapRecord} labels={{ timeline: labels.timeline, highlights: labels.highlights, empty: labels.empty }} /> : null}
      {match.match_participants.slice().sort((a, b) => (a.placement ?? 99) - (b.placement ?? 99)).map((participant) => {
        const deck = getParticipantDeckSnapshot(participant);
        return <PhyrexianPanel key={participant.id} variant="inset" style={styles.player}>
          <CompactDeckCard
            artUri={deck?.commander_image}
            title={getParticipantDisplayName(participant)}
            commander={deck?.name}
            meta={[deck?.commander, participant.was_starting_player ? labels.started : null].filter(Boolean).join(' · ')}
            badge={participant.placement ? `#${participant.placement}` : undefined}
            winner={participant.is_winner}
          />
          <View style={styles.metrics}>{[
            [labels.damageDealt, participant.life_damage_dealt || 0], [labels.lifeLost, participant.life_lost || 0], [labels.lifeGained, participant.life_gained || 0], ['KO', participant.eliminations_caused || 0], [labels.commander, participant.commander_damage_dealt || 0], [labels.infect, participant.infect_dealt || 0],
          ].map(([label, value]) => <View key={String(label)} style={[styles.metric, phoneLayout && styles.metricPhone]}><Text style={styles.meta} numberOfLines={2}>{label}</Text><Text style={styles.value}>{value}</Text></View>)}</View>
        </PhyrexianPanel>;
      })}
    </View>
  </Modal>;
}

const styles = StyleSheet.create({ list: { gap: spacing.sm }, summary: { alignItems: 'center' }, recapLoading: { minHeight: 72, alignItems: 'center', justifyContent: 'center', gap: spacing.xs }, summaryValue: { color: colors.foreground, fontSize: 22, fontWeight: '800' }, player: { gap: spacing.sm }, metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }, metric: { width: '31%', minWidth: 88, minHeight: 66, justifyContent: 'space-between', backgroundColor: colors.surfaceMuted, borderRadius: 8, padding: spacing.sm }, metricPhone: { width: '48%', minWidth: 0, flexGrow: 1 }, meta: { color: colors.muted, fontSize: 10, lineHeight: 13, textTransform: 'uppercase' }, value: { color: colors.foreground, fontSize: 18, fontWeight: '800', marginTop: 4 } });
