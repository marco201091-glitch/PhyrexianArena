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
  const { copy } = useLanguage();
  return (
    <PhyrexianPanel variant="inset" padded={false}>
      {match.is_draw ? (
        <View style={styles.drawBadge}>
          <Text style={styles.drawBadgeText}>{drawLabel}</Text>
        </View>
      ) : null}
      <View style={styles.participants}>
        {match.match_participants.map((participant) => {
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
        <Pressable onPress={onShare} hitSlop={8} style={styles.actionButton} accessibilityRole="button">
          <Ionicons name="share-outline" size={18} color={colors.muted} />
        </Pressable>
        <Pressable onPress={onEdit} hitSlop={8} style={styles.actionButton} accessibilityRole="button">
          <Ionicons name="pencil-outline" size={18} color={colors.muted} />
        </Pressable>
        <Pressable onPress={onDelete} hitSlop={8} style={styles.actionButton} accessibilityRole="button">
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
    minWidth: touch.minWidth - 8,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsButton: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: spacing.sm, marginRight: 'auto' },
  detailsText: { color: colors.primaryMuted, fontSize: 12, fontWeight: '700' },
});
