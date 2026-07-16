import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CommanderArt } from '@/components/deck/commander-art';
import { FormattedMarkdown } from '@/components/ui/formatted-markdown';
import { PhyrexianPanel } from '@/components/ui/phyrexian-panel';
import { colors, spacing, touch } from '@/constants/theme';
import {
  getParticipantDeckSnapshot,
  getParticipantDisplayName,
} from '@/lib/arena-participants';
import type { ArenaMatch } from '@/lib/types/arena';

type MatchCardProps = {
  match: ArenaMatch;
  drawLabel: string;
  onEdit: () => void;
  onShare: () => void;
  onDelete: () => void;
  onDetails?: () => void;
};

export const MatchCard = memo(function MatchCard({ match, drawLabel, onEdit, onShare, onDelete, onDetails }: MatchCardProps) {
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
            <View
              key={participant.id}
              style={[styles.participantRow, isWinner && styles.participantWinner]}
            >
              <CommanderArt
                uri={deck?.commander_image}
                alt={deck?.commander || name}
                size="sm"
                highlighted={isWinner}
              />
              <View style={styles.participantMain}>
                <View style={styles.nameRow}>
                  {isWinner ? (
                    <Ionicons name="trophy" size={14} color={colors.primaryMuted} />
                  ) : null}
                  <Text
                    style={[styles.participantName, isWinner && styles.participantNameWinner]}
                    numberOfLines={1}
                  >
                    {name}
                  </Text>
                  {deck?.bracket ? (
                    <View style={styles.bracketBadge}>
                      <Text style={styles.bracketText}>B{deck.bracket}</Text>
                    </View>
                  ) : null}
                </View>
                {deck?.name ? (
                  <Text style={styles.deckName} numberOfLines={1}>
                    {deck.name}
                  </Text>
                ) : null}
                {deck?.commander ? (
                  <Text style={styles.commander} numberOfLines={2}>
                    {deck.commander}
                  </Text>
                ) : null}
              </View>
            </View>
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
        {onDetails ? <Pressable onPress={onDetails} hitSlop={8} style={styles.detailsButton} accessibilityRole="button"><Ionicons name="stats-chart-outline" size={16} color={colors.primaryMuted} /><Text style={styles.detailsText}>Details</Text></Pressable> : null}
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
    gap: spacing.xs,
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: 10,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  participantWinner: {
    borderWidth: 1,
    borderColor: colors.selectionBorder,
    backgroundColor: colors.selectionTint,
  },
  participantMain: {
    flex: 1,
    gap: 2,
    minWidth: 0,
    paddingTop: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minWidth: 0,
  },
  participantName: {
    flex: 1,
    color: colors.foreground,
    fontSize: 15,
    fontWeight: '600',
    minWidth: 0,
  },
  participantNameWinner: {
    color: colors.primaryMuted,
  },
  deckName: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  commander: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  bracketBadge: {
    borderRadius: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexShrink: 0,
  },
  bracketText: {
    color: '#6ee7b7',
    fontSize: 11,
    fontWeight: '700',
  },
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
