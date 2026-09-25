import { formatGameDuration } from '@/lib/live-game-duration';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CompactDeckCard } from '@/components/deck/compact-deck-card';
import { FormattedMarkdown } from '@/components/ui/formatted-markdown';
import { PhyrexianPanel } from '@/components/ui/phyrexian-panel';
import { colors, spacing, touch } from '@/constants/theme';
import {
  getParticipantDeckSnapshot,
  getParticipantDisplayName,
} from '@/lib/arena-participants';
import type { ArenaMatch } from '@/lib/types/arena';
import { useLanguage } from '@/contexts/language-context';

type MatchCardProps = {
  match: ArenaMatch;
  drawLabel: string;
  onEdit: () => void;
  onShare: () => void;
  onDelete: () => void;
  onDetails?: () => void;
};

function getWinConditionIcon(condition: ArenaMatch['win_condition']): keyof typeof Ionicons.glyphMap {
  if (condition === 'last_standing') return 'shield-checkmark-outline';
  if (condition === 'combo') return 'git-merge-outline';
  if (condition === 'concession') return 'flag-outline';
  if (condition === 'alternate_card') return 'sparkles-outline';
  return 'ellipsis-horizontal-circle-outline';
}

export const MatchCard = memo(function MatchCard({ match, drawLabel, onEdit, onShare, onDelete, onDetails }: MatchCardProps) {
  const { copy, language } = useLanguage();
  const visibleParticipants = match.match_participants;
  return (
    <PhyrexianPanel variant="inset" padded={false}>
      {match.is_draw ? (
        <View style={styles.drawBadge}>
          <Text style={styles.drawBadgeText}>{drawLabel}</Text>
        </View>
      ) : null}
      <View style={styles.summary}>
        <Ionicons name="people-outline" size={18} color={colors.primaryMuted} />
        <Text style={styles.summaryText}>{match.match_participants.length} {language === 'it' ? 'giocatori' : 'players'}</Text>
        {match.duration_seconds != null ? (
          <View style={styles.duration}>
            <Ionicons name="time-outline" size={15} color={colors.muted} />
            <Text style={styles.durationText}>{formatGameDuration(match.duration_seconds)}</Text>
          </View>
        ) : null}
        {match.win_condition ? <Text style={{ color: colors.muted, flexShrink: 1 }}>{({ last_standing: 'Last Standing', combo: 'Combo', concession: language === 'it' ? 'Concessione' : 'Concession', alternate_card: language === 'it' ? 'Vittoria alternativa' : 'Alternate win', other: language === 'it' ? 'Altra vittoria' : 'Other win' })[match.win_condition]}</Text> : null}
      </View>
      <View style={styles.participants}>
        {visibleParticipants.map((participant) => {
          const deck = getParticipantDeckSnapshot(participant);
          const name = getParticipantDisplayName(participant);
          const isWinner = participant.is_winner;

          return (
            <CompactDeckCard
              key={participant.id}
              artUri={deck?.commander_image}
              title={name}
              commander={deck?.name}
              meta={[deck?.commander, deck?.bracket ? `B${deck.bracket}` : null].filter(Boolean).join(' · ')}
              badge={participant.placement ? `#${participant.placement}` : undefined}
              winner={isWinner}
              trailing={isWinner ? (
                <View style={styles.winnerIcons}>
                  <Ionicons name="trophy" size={18} color={colors.primaryMuted} />
                  {match.win_condition ? <Ionicons name={getWinConditionIcon(match.win_condition)} size={17} color={colors.primaryMuted} /> : null}
                </View>
              ) : undefined}
            />
          );
        })}
      </View>

      {match.notes ? (
        <FormattedMarkdown
          value={match.notes}
          style={styles.notes}
          numberOfLines={4}
        />
      ) : null}

      <View style={styles.actions}>
        {onDetails ? <Pressable onPress={onDetails} hitSlop={8} style={styles.detailsButton} accessibilityRole="button"><Ionicons name="stats-chart-outline" size={16} color={colors.primaryMuted} /><Text style={styles.detailsText}>{copy('details')}</Text></Pressable> : null}
        <Pressable accessibilityLabel={language === 'it' ? 'Condividi partita' : 'Share match'} onPress={onShare} hitSlop={8} style={styles.actionButton} accessibilityRole="button">
          <Ionicons name="share-outline" size={18} color={colors.muted} />
        </Pressable>
        <Pressable accessibilityLabel={language === 'it' ? 'Modifica partita' : 'Edit match'} onPress={onEdit} hitSlop={8} style={styles.actionButton} accessibilityRole="button">
          <Ionicons name="pencil-outline" size={18} color={colors.muted} />
        </Pressable>
        <Pressable accessibilityLabel={language === 'it' ? 'Elimina partita' : 'Delete match'} onPress={onDelete} hitSlop={8} style={styles.actionButton} accessibilityRole="button">
          <Ionicons name="trash-outline" size={18} color={colors.muted} />
        </Pressable>
      </View>
    </PhyrexianPanel>
  );
});

const styles = StyleSheet.create({
  drawBadge: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    marginLeft: spacing.md,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.selectionBorder,
    backgroundColor: colors.selectionTint,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  drawBadgeText: {
    color: colors.primaryMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  summary: { padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryText: { color: colors.foreground, flex: 1 },
  duration: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  durationText: { color: colors.muted, fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  participants: {
    gap: spacing.sm,
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  winnerIcons: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  notes: {
    color: colors.muted,
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  actionButton: {
    minWidth: touch.minWidth,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: spacing.sm, marginRight: 'auto' },
  detailsText: { color: colors.primaryMuted, fontSize: 12, fontWeight: '700' },
});
