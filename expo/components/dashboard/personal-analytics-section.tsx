import { StyleSheet, Text, View } from 'react-native';

import { CommanderArt } from '@/components/deck/commander-art';
import { ManaColorBadge, ManaColorPills } from '@/components/ui/mana-color-pills';
import { PhyrexianPanel } from '@/components/ui/phyrexian-panel';
import { StatCard } from '@/components/ui/stat-card';
import { SectionHeader } from '@/components/ui/section-header';
import { EmptyState } from '@/components/ui/empty-state';
import { cardRowGap, colors, sectionStackGap, spacing } from '@/constants/theme';
import { MANA_COLOR_LABELS } from '@/lib/mana-colors';
import type { PersonalAnalytics } from '@/lib/personal-analytics';
import type { AppLanguage } from '@/lib/i18n/types';

type PersonalAnalyticsSectionProps = {
  analytics: PersonalAnalytics | null;
  language: AppLanguage;
  title: string;
  subtitle: string;
  emptyTitle: string;
  emptyBody: string;
  topDecksTitle: string;
  topDecksSubtitle: string;
  decksPlayedLabel: string;
  winsLabel: string;
  winRateLabel: string;
  winLabel: string;
  colorsTitle: string;
  colorWinRatesTitle: string;
  currentWinStreakLabel: string;
  longestWinStreakLabel: string;
  bestDeckTitle: string;
  bestDeckHint: string;
  trackedGamesLabel: string;
};

export function PersonalAnalyticsSection({
  analytics,
  language,
  title,
  subtitle,
  emptyTitle,
  emptyBody,
  topDecksTitle,
  topDecksSubtitle,
  decksPlayedLabel,
  winsLabel,
  winRateLabel,
  winLabel,
  colorsTitle,
  colorWinRatesTitle,
  currentWinStreakLabel,
  longestWinStreakLabel,
  bestDeckTitle,
  bestDeckHint,
  trackedGamesLabel,
}: PersonalAnalyticsSectionProps) {
  const hasData = analytics && analytics.gamesPlayed > 0;
  const formatStreak = (value: number) => (value > 0 ? `${value}W` : '0');

  return (
    <View style={styles.section}>
      <SectionHeader title={title} subtitle={subtitle} />

      {!hasData ? (
        <EmptyState icon="bar-chart-outline" title={emptyTitle} body={emptyBody} />
      ) : (
        <View style={styles.content}>
          <View style={styles.summaryRow}>
            {[
              { label: trackedGamesLabel, value: analytics.gamesPlayed },
              { label: decksPlayedLabel, value: analytics.uniqueDecks },
              { label: winsLabel, value: analytics.wins },
              { label: winRateLabel, value: `${Math.round((analytics.wins / analytics.gamesPlayed) * 100)}%` },
            ].map((item) => (
              <StatCard
                key={item.label}
                label={item.label}
                value={item.value}
                compact
                style={styles.summaryCard}
              />
            ))}
          </View>

          <View style={styles.summaryRow}>
            <StatCard
              label={currentWinStreakLabel}
              value={formatStreak(analytics.currentWinStreak)}
              compact
              style={styles.summaryCard}
              valueColor={analytics.currentWinStreak > 0 ? colors.successBright : undefined}
            />
            <StatCard
              label={longestWinStreakLabel}
              value={formatStreak(analytics.longestWinStreak)}
              compact
              style={styles.summaryCard}
              valueColor={analytics.longestWinStreak > 0 ? colors.amber : undefined}
            />
          </View>

          {analytics.bestDeck ? (
            <PhyrexianPanel>
              <Text style={styles.cardTitle}>{bestDeckTitle}</Text>
              <Text style={styles.cardSubtitle}>{bestDeckHint}</Text>
              <View style={styles.deckRow}>
                <View style={styles.deckArtWrap}>
                  <CommanderArt
                    uri={analytics.bestDeck.commanderImage}
                    alt={analytics.bestDeck.commander}
                    size="sm"
                  />
                </View>
                <View style={styles.deckInfo}>
                  <View style={styles.deckTitleRow}>
                    <Text style={styles.deckName} numberOfLines={1}>{analytics.bestDeck.name}</Text>
                    <ManaColorPills colors={analytics.bestDeck.colors} language={language} />
                  </View>
                  <Text style={styles.commander} numberOfLines={1}>{analytics.bestDeck.commander}</Text>
                </View>
                <View style={styles.deckStats}>
                  <Text style={styles.deckStatsMain}>
                    {analytics.bestDeck.gamesPlayed}G / {analytics.bestDeck.wins}W
                  </Text>
                  <Text style={styles.deckStatsSub}>{analytics.bestDeck.winRate}% {winLabel}</Text>
                </View>
              </View>
            </PhyrexianPanel>
          ) : null}

          <PhyrexianPanel>
            <Text style={styles.cardTitle}>{topDecksTitle}</Text>
            <Text style={styles.cardSubtitle}>{topDecksSubtitle}</Text>
            <View style={styles.deckList}>
              {analytics.topDecks.map((deck, index) => (
                <View key={deck.id} style={styles.deckRow}>
                  <View style={styles.deckArtWrap}>
                    <CommanderArt uri={deck.commanderImage} alt={deck.commander} size="sm" />
                    <View style={styles.rank}>
                      <Text style={styles.rankText}>{index + 1}</Text>
                    </View>
                  </View>
                  <View style={styles.deckInfo}>
                    <View style={styles.deckTitleRow}>
                      <Text style={styles.deckName} numberOfLines={1}>{deck.name}</Text>
                      <ManaColorPills colors={deck.colors} language={language} />
                    </View>
                    <Text style={styles.commander} numberOfLines={1}>{deck.commander}</Text>
                  </View>
                  <View style={styles.deckStats}>
                    <Text style={styles.deckStatsMain}>{deck.gamesPlayed}G / {deck.wins}W</Text>
                    <Text style={styles.deckStatsSub}>{deck.winRate}% {winLabel}</Text>
                  </View>
                </View>
              ))}
            </View>
          </PhyrexianPanel>

          {analytics.colorWinStats.length > 0 ? (
            <PhyrexianPanel>
              <Text style={styles.cardTitle}>{colorWinRatesTitle}</Text>
              <View style={styles.colorList}>
                {analytics.colorWinStats.map((stat) => {
                  const label = MANA_COLOR_LABELS[stat.color] || MANA_COLOR_LABELS.C;
                  return (
                    <View key={`win-${stat.color}`} style={styles.colorRow}>
                      <View style={styles.colorHeader}>
                        <ManaColorBadge color={stat.color} size="sm" />
                        <Text style={styles.colorName}>{label[language]}</Text>
                        <Text style={styles.colorCount}>
                          {stat.wins}W · {stat.winRate}%
                        </Text>
                      </View>
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${stat.winRate}%` }]} />
                      </View>
                    </View>
                  );
                })}
              </View>
            </PhyrexianPanel>
          ) : null}

          <PhyrexianPanel>
            <Text style={styles.cardTitle}>{colorsTitle}</Text>
            <View style={styles.colorList}>
              {analytics.colorStats.map((stat) => {
                const label = MANA_COLOR_LABELS[stat.color] || MANA_COLOR_LABELS.C;
                return (
                  <View key={stat.color} style={styles.colorRow}>
                    <View style={styles.colorHeader}>
                      <ManaColorBadge color={stat.color} size="sm" />
                      <Text style={styles.colorName}>{label[language]}</Text>
                      <Text style={styles.colorCount}>{stat.gamesPlayed} / {stat.percentage}%</Text>
                    </View>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${stat.percentage}%` }]} />
                    </View>
                  </View>
                );
              })}
            </View>
          </PhyrexianPanel>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: sectionStackGap,
    marginTop: spacing.sm,
  },
  header: {
    gap: spacing.sm,
  },
  headerText: {
    gap: 4,
  },
  title: {
    color: colors.foreground,
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  gamesCount: {
    color: colors.muted,
    fontSize: 13,
  },
  emptyCard: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTitle: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyBody: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  content: {
    gap: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
    gap: cardRowGap,
  },
  summaryCard: {
    minWidth: 140,
  },
  cardTitle: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: '700',
  },
  cardSubtitle: {
    color: colors.muted,
    fontSize: 12,
    marginBottom: spacing.sm,
  },
  deckList: {
    gap: spacing.sm,
  },
  deckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    backgroundColor: colors.cardInset,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.sm + 2,
  },
  deckArtWrap: {
    position: 'relative',
  },
  rank: {
    position: 'absolute',
    top: -4,
    left: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primarySurface,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    color: colors.primaryMuted,
    fontWeight: '700',
    fontSize: 10,
  },
  deckInfo: {
    flex: 1,
    gap: 2,
  },
  deckTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  deckName: {
    color: colors.foreground,
    fontWeight: '600',
    fontSize: 14,
    flexShrink: 1,
  },
  commander: {
    color: colors.primaryMuted,
    fontSize: 12,
  },
  deckStats: {
    alignItems: 'flex-end',
  },
  deckStatsMain: {
    color: colors.foreground,
    fontSize: 12,
    fontWeight: '600',
  },
  deckStatsSub: {
    color: colors.muted,
    fontSize: 11,
  },
  colorList: {
    gap: 10,
    marginTop: spacing.sm,
  },
  colorRow: {
    gap: 6,
  },
  colorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorName: {
    flex: 1,
    color: colors.foreground,
    fontSize: 13,
    fontWeight: '500',
  },
  colorCount: {
    color: colors.muted,
    fontSize: 12,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceTrack,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.primaryLight,
  },
});
