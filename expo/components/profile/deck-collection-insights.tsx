import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ManaColorBadge, ManaColorPills } from '@/components/ui/mana-color-pills';
import { PhyrexianPanel } from '@/components/ui/phyrexian-panel';
import { StatCard } from '@/components/ui/stat-card';
import { Button } from '@/components/ui/button';
import { cardRowGap, colors, spacing } from '@/constants/theme';
import {
  buildAverageCommanderCmc,
  buildDeckCollectionAnalytics,
  type DeckCollectionSnapshot,
} from '@/lib/deck-collection-analytics';
import { MANA_COLOR_LABELS } from '@/lib/mana-colors';
import type { AppLanguage } from '@/lib/i18n/types';

type DeckCollectionInsightsProps = {
  decks: DeckCollectionSnapshot[];
  language: AppLanguage;
  labels: {
    avgBracket: string;
    avgCommanderCmc: string;
    decksAnalyzed: (count: number) => string;
    details: string;
    collapse: string;
    mostCommonColors: string;
    fullColorCombos: string;
    sources: string;
    bracketSpread: string;
    avgColorsPerDeck: (value: number) => string;
    sourceMoxfield: string;
    sourceArchidekt: string;
    sourceManual: string;
    sourceOther: string;
  };
};

const SOURCE_LABEL_KEYS = {
  moxfield: 'sourceMoxfield',
  archidekt: 'sourceArchidekt',
  manual: 'sourceManual',
  other: 'sourceOther',
} as const;

export function DeckCollectionInsights({ decks, language, labels }: DeckCollectionInsightsProps) {
  const [expanded, setExpanded] = useState(false);
  const analytics = useMemo(() => buildDeckCollectionAnalytics(decks), [decks]);
  const averageCmc = useMemo(() => buildAverageCommanderCmc(decks), [decks]);

  if (analytics.deckCount === 0) return null;

  return (
    <PhyrexianPanel padded={false} style={styles.panel}>
      <View style={styles.summaryRow}>
        <View style={styles.statGrid}>
          <StatCard
            inset
            compact
            label={labels.avgBracket}
            value={analytics.averageBracket != null ? String(analytics.averageBracket) : '—'}
            valueColor={colors.success}
          />
          <StatCard
            inset
            compact
            label={labels.avgCommanderCmc}
            value={averageCmc != null ? String(averageCmc) : '—'}
            valueColor={colors.primaryMuted}
          />
        </View>
        <View style={styles.summaryActions}>
          <Text style={styles.deckCount}>{labels.decksAnalyzed(analytics.deckCount)}</Text>
          <Button
            label={expanded ? labels.collapse : labels.details}
            variant="outline"
            size="sm"
            icon={expanded ? 'chevron-up-outline' : 'layers-outline'}
            onPress={() => setExpanded((value) => !value)}
          />
        </View>
      </View>

      {expanded ? (
        <View style={styles.details}>
          <View style={styles.detailSection}>
            <Text style={styles.sectionLabel}>{labels.mostCommonColors}</Text>
            {analytics.colorStats.slice(0, 6).map((stat) => {
              const label = MANA_COLOR_LABELS[stat.color] || MANA_COLOR_LABELS.C;
              return (
                <View key={stat.color} style={styles.barRow}>
                  <View style={styles.barHeader}>
                    <View style={styles.barTitle}>
                      <ManaColorBadge color={stat.color} size="sm" accessibilityLabel={label[language]} />
                      <Text style={styles.barName}>{label[language]}</Text>
                    </View>
                    <Text style={styles.barMeta}>{stat.count} · {stat.percentage}%</Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFillViolet, { width: `${Math.max(stat.percentage, stat.count > 0 ? 8 : 0)}%` }]} />
                  </View>
                </View>
              );
            })}
          </View>

          <View style={styles.detailSection}>
            <Text style={styles.sectionLabel}>{labels.fullColorCombos}</Text>
            {analytics.combinationStats.slice(0, 6).map((stat) => (
              <View key={stat.key} style={styles.barRow}>
                <View style={styles.barHeader}>
                  <ManaColorPills colors={stat.colors} size="xs" language={language} />
                  <Text style={styles.barMeta}>{stat.count} · {stat.percentage}%</Text>
                </View>
                <View style={styles.barTrack}>
                  <View style={[styles.barFillSky, { width: `${Math.max(stat.percentage, stat.count > 0 ? 8 : 0)}%` }]} />
                </View>
              </View>
            ))}
          </View>

          <View style={styles.footerRow}>
            <View style={styles.footerSection}>
              <Text style={styles.sectionLabel}>{labels.sources}</Text>
              <View style={styles.chipRow}>
                {analytics.sourceStats.map((stat) => {
                  const labelKey = SOURCE_LABEL_KEYS[stat.source as keyof typeof SOURCE_LABEL_KEYS] || 'sourceOther';
                  const sourceLabel = labels[labelKey];
                  return (
                    <View key={stat.source} style={styles.sourceChip}>
                      <Text style={styles.sourceChipText}>
                        {sourceLabel} · {stat.percentage}%
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {analytics.bracketStats.length > 0 ? (
              <View style={styles.footerSection}>
                <Text style={styles.sectionLabel}>{labels.bracketSpread}</Text>
                <View style={styles.chipRow}>
                  {analytics.bracketStats.map((stat) => (
                    <View key={stat.bracket} style={styles.bracketChip}>
                      <Text style={styles.bracketChipText}>B{stat.bracket} · {stat.count}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </View>

          {analytics.averageColorCount != null ? (
            <Text style={styles.avgColors}>
              {labels.avgColorsPerDeck(analytics.averageColorCount)}
            </Text>
          ) : null}
        </View>
      ) : null}
    </PhyrexianPanel>
  );
}

const styles = StyleSheet.create({
  panel: {
    overflow: 'hidden',
  },
  summaryRow: {
    gap: spacing.md,
    padding: spacing.md,
  },
  statGrid: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: cardRowGap,
  },
  summaryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  deckCount: {
    color: colors.muted,
    fontSize: 12,
    flex: 1,
  },
  details: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    padding: spacing.md,
    gap: spacing.lg,
  },
  detailSection: {
    gap: spacing.sm,
  },
  sectionLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  barRow: {
    gap: 6,
  },
  barHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  barTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  barName: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
  },
  barMeta: {
    color: colors.muted,
    fontSize: 12,
  },
  barTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  barFillViolet: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: 'rgba(167, 139, 250, 0.9)',
  },
  barFillSky: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: 'rgba(56, 189, 248, 0.85)',
  },
  footerRow: {
    gap: spacing.md,
  },
  footerSection: {
    gap: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  sourceChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.cardInset,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sourceChipText: {
    color: colors.foreground,
    fontSize: 12,
  },
  bracketChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  bracketChipText: {
    color: '#6ee7b7',
    fontSize: 12,
  },
  avgColors: {
    color: colors.muted,
    fontSize: 12,
  },
});