import { memo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CommanderArt } from '@/components/deck/commander-art';
import { DeckExternalLinkChip } from '@/components/deck/deck-external-link-chip';
import { EdhrecInsights } from '@/components/deck/edhrec-insights';
import { ManaColorPills } from '@/components/ui/mana-color-pills';
import { PhyrexianPanel } from '@/components/ui/phyrexian-panel';
import { colors, spacing } from '@/constants/theme';
import { getDeckDisplayColors } from '@/lib/deck-metadata';
import type { DeckWinRate, ProfileDeck } from '@/lib/types/profile';

type DeckCardProps = {
  deck: ProfileDeck;
  winRate?: DeckWinRate;
  gamesLabel: string;
  winsLabel: string;
  openDeckLabel: string;
  viewOnEdhrecLabel: string;
  refreshing?: boolean;
  onEdit?: () => void;
  onRefresh?: () => void;
  onDelete: () => void;
};

function externalLinkTone(sourceType: string | null | undefined): 'violet' | 'blue' | 'purple' {
  if (sourceType === 'moxfield') return 'blue';
  if (sourceType === 'archidekt') return 'purple';
  return 'violet';
}

export const DeckCard = memo(function DeckCard({
  deck,
  winRate,
  gamesLabel,
  winsLabel,
  openDeckLabel,
  viewOnEdhrecLabel,
  refreshing = false,
  onEdit,
  onRefresh,
  onDelete,
}: DeckCardProps) {
  const manaColors = getDeckDisplayColors(deck);
  const canRefresh = deck.source_type !== 'manual' && Boolean(deck.source_url);

  return (
    <PhyrexianPanel padded={false} style={styles.card}>
      <View style={styles.row}>
        <CommanderArt
          uri={deck.commander_image}
          alt={deck.commander}
          size="hero"
          style={styles.art}
        />

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={2}>{deck.name}</Text>
            <ManaColorPills colors={manaColors} />
          </View>

          <Text style={styles.commander} numberOfLines={2}>{deck.commander}</Text>

          <View style={styles.metaRow}>
            {deck.source_type ? (
              <Text style={styles.source}>{deck.source_type}</Text>
            ) : null}
            {deck.bracket ? (
              <Text style={styles.bracket}>B{deck.bracket}</Text>
            ) : null}
          </View>

          {winRate && winRate.gamesPlayed > 0 ? (
            <View style={styles.statsRow}>
              <Text style={styles.statValue}>{winRate.winRate}%</Text>
              <Text style={styles.stats}>
                {winRate.gamesPlayed} {gamesLabel} · {winRate.wins} {winsLabel}
              </Text>
            </View>
          ) : null}

          <EdhrecInsights
            commander={deck.commander}
            viewOnEdhrecLabel={viewOnEdhrecLabel}
            layout="stacked"
          />

          {deck.source_url ? (
            <DeckExternalLinkChip
              href={deck.source_url}
              label={openDeckLabel}
              tone={externalLinkTone(deck.source_type)}
            />
          ) : null}
        </View>
      </View>

      <View style={styles.actions}>
        {onEdit ? (
          <Pressable onPress={onEdit} style={styles.actionButton} accessibilityRole="button">
            <Ionicons name="create-outline" size={20} color={colors.primaryMuted} />
          </Pressable>
        ) : null}
        {canRefresh && onRefresh ? (
          <Pressable onPress={onRefresh} style={styles.actionButton} disabled={refreshing}>
            {refreshing ? (
              <ActivityIndicator size="small" color={colors.muted} />
            ) : (
              <Ionicons name="refresh-outline" size={20} color={colors.primaryMuted} />
            )}
          </Pressable>
        ) : null}
        <Pressable onPress={onDelete} style={styles.actionButton}>
          <Ionicons name="trash-outline" size={18} color={colors.muted} />
        </Pressable>
      </View>
    </PhyrexianPanel>
  );
});

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  art: {
    flexShrink: 0,
  },
  content: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  name: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    minWidth: 0,
  },
  commander: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  source: {
    color: colors.primaryMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  bracket: {
    color: '#6ee7b7',
    fontSize: 11,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  statValue: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: '700',
  },
  stats: {
    color: colors.muted,
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  actionButton: {
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});