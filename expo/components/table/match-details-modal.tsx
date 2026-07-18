import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LiveGameRecapView } from '@/components/live-game/live-game-recap';
import { CommanderArt } from '@/components/deck/commander-art';
import { Modal } from '@/components/ui/modal';
import { ModalHeader } from '@/components/ui/modal-header';
import { PhyrexianPanel } from '@/components/ui/phyrexian-panel';
import { colors, spacing } from '@/constants/theme';
import { getParticipantDeckSnapshot, getParticipantDisplayName } from '@/lib/arena-participants';
import { formatGameDuration } from '@/lib/live-game-duration';
import type { ArenaMatch } from '@/lib/types/arena';
import type { LiveGameRecord } from '@/lib/live-game';

type Props = { visible: boolean; match: ArenaMatch | null; liveGame: LiveGameRecord | null; recapLoading: boolean; onClose: () => void; labels: Record<'title' | 'duration' | 'events' | 'damageDealt' | 'lifeLost' | 'lifeGained' | 'commander' | 'infect' | 'started' | 'timeline' | 'highlights' | 'empty' | 'recap', string> };

export function MatchDetailsModal({ visible, match, liveGame, recapLoading, onClose, labels }: Props) {
  if (!match) return null;
  return <Modal visible={visible} onClose={onClose} presentation="dialog" maxWidth={620}>
    <ModalHeader title={labels.title} subtitle={match.duration_seconds != null ? `${labels.duration}: ${formatGameDuration(match.duration_seconds)}` : undefined} icon="stats-chart-outline" onClose={onClose} />
    <ScrollView contentContainerStyle={styles.list}>
      <PhyrexianPanel variant="inset" style={styles.summary}><Text style={styles.meta}>{labels.events}</Text><Text style={styles.summaryValue}>{match.match_participants.reduce((total, player) => total + (player.tracked_event_count || 0), 0)}</Text></PhyrexianPanel>
      {recapLoading ? <View style={styles.recapLoading}><ActivityIndicator color={colors.primaryMuted} /><Text style={styles.meta}>{labels.recap}</Text></View> : null}
      {liveGame ? <LiveGameRecapView record={liveGame} labels={{ timeline: labels.timeline, highlights: labels.highlights, empty: labels.empty }} /> : null}
      {match.match_participants.slice().sort((a, b) => (a.placement ?? 99) - (b.placement ?? 99)).map((participant) => {
        const deck = getParticipantDeckSnapshot(participant);
        return <PhyrexianPanel key={participant.id} variant="inset" style={styles.player}>
          <View style={styles.header}><CommanderArt uri={deck?.commander_image} alt={deck?.commander || ''} size="sm" /><View style={styles.main}><Text style={styles.name}>{getParticipantDisplayName(participant)}{participant.placement ? ` · #${participant.placement}` : ''}</Text><Text style={styles.commander} numberOfLines={1}>{deck?.commander}</Text>{participant.was_starting_player ? <Text style={styles.started}>{labels.started}</Text> : null}</View></View>
          <View style={styles.metrics}>{[
            [labels.damageDealt, participant.life_damage_dealt || 0], [labels.lifeLost, participant.life_lost || 0], [labels.lifeGained, participant.life_gained || 0], ['KO', participant.eliminations_caused || 0], [labels.commander, participant.commander_damage_dealt || 0], [labels.infect, participant.infect_dealt || 0],
          ].map(([label, value]) => <View key={String(label)} style={styles.metric}><Text style={styles.meta}>{label}</Text><Text style={styles.value}>{value}</Text></View>)}</View>
        </PhyrexianPanel>;
      })}
    </ScrollView>
  </Modal>;
}

const styles = StyleSheet.create({ list: { gap: spacing.sm }, summary: { alignItems: 'center' }, recapLoading: { minHeight: 72, alignItems: 'center', justifyContent: 'center', gap: spacing.xs }, summaryValue: { color: colors.foreground, fontSize: 22, fontWeight: '800' }, player: { gap: spacing.sm }, header: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }, main: { flex: 1 }, name: { color: colors.foreground, fontSize: 14, fontWeight: '700' }, commander: { color: colors.muted, fontSize: 12 }, started: { color: colors.primaryMuted, fontSize: 10, marginTop: 2 }, metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }, metric: { width: '31%', minWidth: 88, backgroundColor: colors.surfaceMuted, borderRadius: 8, padding: spacing.sm }, meta: { color: colors.muted, fontSize: 10, textTransform: 'uppercase' }, value: { color: colors.foreground, fontSize: 16, fontWeight: '800', marginTop: 2 } });
