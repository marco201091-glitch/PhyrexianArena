import { memo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DeckImage } from '@/components/deck/deck-image';
import { DeckExternalLinkChip } from '@/components/deck/deck-external-link-chip';
import { EdhrecInsights } from '@/components/deck/edhrec-insights';
import { DeckMasteryBadge } from '@/components/profile/deck-mastery-badge';
import { ManaColorPills } from '@/components/ui/mana-color-pills';
import { PhyrexianPanel } from '@/components/ui/phyrexian-panel';
import { colors, spacing } from '@/constants/theme';
import { getDeckMastery } from '@/lib/deck-mastery';
import { getDeckDisplayColors } from '@/lib/deck-metadata';
import type { AppLanguage } from '@/lib/i18n/types';
import type { DeckWinRate, ProfileDeck } from '@/lib/types/profile';

type DeckCardProps = {
  deck: ProfileDeck;
  winRate?: DeckWinRate;
  openDeckLabel: string;
  viewOnEdhrecLabel: string;
  refreshing?: boolean;
  detailsLabel: string;
  language: AppLanguage;
  onDetails: () => void;
  onEdit?: () => void;
  onRefresh?: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
};

function externalLinkTone(sourceType: string | null | undefined): 'violet' | 'blue' | 'purple' {
  if (sourceType === 'moxfield') return 'blue';
  if (sourceType === 'archidekt') return 'purple';
  return 'violet';
}

export const DeckCard = memo(function DeckCard({
  deck,
  winRate,
  openDeckLabel,
  viewOnEdhrecLabel,
  refreshing = false,
  detailsLabel,
  language,
  onDetails,
  onEdit,
  onRefresh,
  onDelete,
  onToggleFavorite,
}: DeckCardProps) {
  const manaColors = getDeckDisplayColors(deck);
  const canRefresh = deck.source_type !== 'manual' && Boolean(deck.source_url);
  const gamesPlayed = winRate?.gamesPlayed ?? 0;
  const wins = winRate?.wins ?? 0;
  const mastery = getDeckMastery(gamesPlayed, wins);
  const hasMastery = gamesPlayed > 0;

  return (
    <PhyrexianPanel
      padded={false}
      style={[
        styles.card,
        hasMastery && {
          borderColor: mastery.color,
          shadowColor: mastery.color,
          shadowOpacity: 0.28,
          shadowRadius: 12,
          elevation: 8,
        },
      ]}
    >
      <DeckImage
        uri={deck.commander_image}
        alt={deck.commander}
        style={styles.backgroundArt}
        containerStyle={styles.backgroundArt}
        contentFit="cover"
        contentPosition="top"
      />
      <View pointerEvents="none" style={styles.scrim} />

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <View style={styles.titleCopy}>
            <Text style={styles.name} numberOfLines={2}>{deck.name}</Text>
            <Text style={styles.commander} numberOfLines={2}>{deck.commander}</Text>
          </View>
          <ManaColorPills colors={manaColors} size="xs" language={language} />
        </View>

        <View style={styles.metaRow}>
          {deck.source_type ? <Text style={styles.source}>{deck.source_type}</Text> : null}
          {deck.bracket ? <Text style={styles.bracket}>B{deck.bracket}</Text> : null}
        </View>

        <View style={styles.performanceRow}>
          <DeckMasteryBadge gamesPlayed={gamesPlayed} wins={wins} language={language} />
          <View style={styles.winRateStat}>
            <Text style={styles.statValue}>{winRate?.winRate ?? 0}%</Text>
            <Text style={styles.statLabel}>Win rate</Text>
          </View>
        </View>

        <View style={styles.linksRow}>
          <EdhrecInsights
            commander={deck.commander}
            viewOnEdhrecLabel={viewOnEdhrecLabel}
            layout="inline"
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
        <Pressable
          onPress={onToggleFavorite}
          style={styles.actionButton}
          accessibilityRole="button"
          accessibilityState={{ selected: deck.is_favorite }}
        >
          <Ionicons
            name={deck.is_favorite ? 'star' : 'star-outline'}
            size={20}
            color={deck.is_favorite ? '#fcd34d' : colors.primaryMuted}
          />
        </Pressable>
        <Pressable onPress={onDetails} style={[styles.actionButton, styles.detailsButton]} accessibilityRole="button">
          <Ionicons name="stats-chart-outline" size={18} color={colors.primaryMuted} />
          <Text style={styles.detailsLabel}>{detailsLabel}</Text>
        </Pressable>
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
    minHeight: 286,
    borderWidth: 2,
  },
  backgroundArt: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  scrim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(4, 6, 10, 0.66)',
  },
  content: {
    minHeight: 230,
    padding: spacing.lg,
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  titleCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  name: {
    color: '#fff',
    fontSize: 19,
    lineHeight: 23,
    fontWeight: '800',
  },
  commander: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  source: {
    color: '#ddd6fe',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  bracket: {
    color: '#6ee7b7',
    fontSize: 11,
    fontWeight: '700',
  },
  performanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  winRateStat: {
    minWidth: 76,
    alignItems: 'center',
  },
  statValue: {
    color: '#fff',
    fontSize: 19,
    fontWeight: '800',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  linksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(3, 4, 8, 0.78)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  actionButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsButton: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  detailsLabel: {
    color: colors.primaryMuted,
    fontSize: 12,
    fontWeight: '700',
  },
});
