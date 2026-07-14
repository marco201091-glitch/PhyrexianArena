import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ManaColorPills } from '@/components/ui/mana-color-pills';
import { colors } from '@/constants/theme';
import type { ArenaColorPairStat, ArenaColorStat } from '@/lib/arena-color-analytics';
import { MANA_CHART_COLORS, MANA_COLOR_LABELS, MANA_COLOR_ORDER } from '@/lib/mana-colors';
import type { AppLanguage } from '@/lib/i18n/types';

type ColorReportSortKey = 'color' | 'appearances' | 'wins' | 'winRate';

type ColorReportRow = {
  color: string;
  appearances: number;
  percentage: number;
  wins: number;
  winRate: number | null;
  isActive: boolean;
};

type ManaColorReportLabels = {
  colors: string;
  sort: string;
  color: string;
  appearances: string;
  wins: string;
  winRate: string;
  noGamesInPeriod: string;
  minThreeGames: string;
  emptyLabel: string;
  missingColorGames: (count: number) => string;
};

type ManaColorReportProps = {
  played: ArenaColorStat[];
  won: ArenaColorStat[];
  winRates: ArenaColorStat[];
  missingColorGames: number;
  language: AppLanguage;
  labels: ManaColorReportLabels;
};

type ManaColorPairsLabels = {
  emptyLabel: string;
  pairsHint: string;
  pentacolor: string;
};

type ManaColorPairsProps = {
  pairs: ArenaColorPairStat[];
  language: AppLanguage;
  labels: ManaColorPairsLabels;
};

function fillAllColorStats(data: ArenaColorStat[]): ArenaColorStat[] {
  const byColor = new Map(data.map((entry) => [entry.color, entry]));

  return MANA_COLOR_ORDER.map((color) => byColor.get(color) || {
    color,
    appearances: 0,
    wins: 0,
    percentage: 0,
    winRate: 0,
  });
}

function ColorBar({
  value,
  max,
  color,
  muted = false,
}: {
  value: number;
  max: number;
  color: string;
  muted?: boolean;
}) {
  const width = max > 0 ? Math.max((value / max) * 100, value > 0 ? 8 : 0) : 0;

  return (
    <View style={[styles.barTrack, muted && styles.barTrackMuted]}>
      <View
        style={[
          styles.barFill,
          {
            width: `${width}%`,
            backgroundColor: muted ? 'transparent' : (MANA_CHART_COLORS[color] || MANA_CHART_COLORS.C),
          },
        ]}
      />
    </View>
  );
}

export function ManaColorLegend({ language, colorsLabel }: { language: AppLanguage; colorsLabel: string }) {
  return (
    <View style={styles.legend}>
      <Text style={styles.legendTitle}>{colorsLabel}</Text>
      <View style={styles.legendRow}>
        {MANA_COLOR_ORDER.map((color) => (
          <View key={color} style={styles.legendItem}>
            <ManaColorPills colors={[color]} />
            <Text style={styles.legendLabel}>{MANA_COLOR_LABELS[color]?.[language] || color}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function ManaColorReport({
  played,
  won,
  winRates,
  missingColorGames,
  language,
  labels,
}: ManaColorReportProps) {
  const [sortKey, setSortKey] = useState<ColorReportSortKey>('appearances');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const toggleSort = (key: ColorReportSortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(key);
    setSortDirection(key === 'color' ? 'asc' : 'desc');
  };

  const colorOrder = useMemo(
    () => new Map<string, number>(MANA_COLOR_ORDER.map((color, index) => [color, index])),
    [],
  );

  const rows = useMemo<ColorReportRow[]>(() => {
    const allPlayed = fillAllColorStats(played);
    const wonByColor = new Map(won.map((entry) => [entry.color, entry]));
    const winRateByColor = new Map(winRates.map((entry) => [entry.color, entry]));

    return allPlayed.map((entry) => {
      const wonEntry = wonByColor.get(entry.color);
      const winRateEntry = winRateByColor.get(entry.color);

      return {
        color: entry.color,
        appearances: entry.appearances,
        percentage: entry.percentage,
        wins: wonEntry?.appearances ?? 0,
        winRate: winRateEntry?.winRate ?? null,
        isActive: entry.appearances > 0,
      };
    });
  }, [played, won, winRates]);

  const sortedRows = useMemo(() => {
    const multiplier = sortDirection === 'asc' ? 1 : -1;

    return [...rows].sort((a, b) => {
      switch (sortKey) {
        case 'color':
          return ((colorOrder.get(a.color) ?? 99) - (colorOrder.get(b.color) ?? 99)) * multiplier;
        case 'appearances':
          return (a.appearances - b.appearances) * multiplier
            || ((colorOrder.get(a.color) ?? 99) - (colorOrder.get(b.color) ?? 99));
        case 'wins':
          return (a.wins - b.wins) * multiplier || (a.appearances - b.appearances) * multiplier;
        case 'winRate': {
          const aRate = a.winRate ?? -1;
          const bRate = b.winRate ?? -1;
          return (aRate - bRate) * multiplier || (a.appearances - b.appearances) * multiplier;
        }
        default:
          return 0;
      }
    });
  }, [colorOrder, rows, sortDirection, sortKey]);

  const maxAppearances = Math.max(...rows.map((entry) => entry.appearances), 1);

  if (played.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <ManaColorLegend language={language} colorsLabel={labels.colors} />
        <Text style={styles.emptyText}>{labels.emptyLabel}</Text>
      </View>
    );
  }

  const sortOptions: Array<{ key: ColorReportSortKey; label: string }> = [
    { key: 'color', label: labels.color },
    { key: 'appearances', label: labels.appearances },
    { key: 'wins', label: labels.wins },
    { key: 'winRate', label: labels.winRate },
  ];

  return (
    <View style={styles.report}>
      <ManaColorLegend language={language} colorsLabel={labels.colors} />

      {missingColorGames > 0 ? (
        <Text style={styles.warning}>{labels.missingColorGames(missingColorGames)}</Text>
      ) : null}

      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>{labels.sort}</Text>
        {sortOptions.map((option) => {
          const active = sortKey === option.key;
          return (
            <Pressable
              key={option.key}
              style={[styles.sortChip, active && styles.sortChipActive]}
              onPress={() => toggleSort(option.key)}
            >
              <Text style={[styles.sortChipLabel, active && styles.sortChipLabelActive]}>
                {option.label}
                {active ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ''}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.table}>
        {sortedRows.map((entry) => (
          <View key={entry.color} style={[styles.row, !entry.isActive && styles.rowMuted]}>
            <View style={styles.rowHeader}>
              <ManaColorPills colors={[entry.color]} />
              <View style={styles.rowTitleWrap}>
                <Text style={[styles.rowTitle, !entry.isActive && styles.rowTitleMuted]}>
                  {MANA_COLOR_LABELS[entry.color]?.[language] || entry.color}
                </Text>
                {!entry.isActive ? (
                  <Text style={styles.rowSubtitle}>{labels.noGamesInPeriod}</Text>
                ) : null}
              </View>
              <Text style={styles.rowWinRate}>
                {entry.winRate !== null
                  ? `${entry.winRate}%`
                  : entry.appearances > 0 && entry.appearances < 3
                    ? labels.minThreeGames
                    : '—'}
              </Text>
            </View>

            <View style={styles.statsLine}>
              <Text style={styles.statsValue}>{entry.appearances}</Text>
              <Text style={styles.statsMeta}>{entry.isActive ? `${entry.percentage}%` : '0%'}</Text>
              <Text style={styles.statsWins}>{entry.wins} {labels.wins.toLowerCase()}</Text>
            </View>

            <ColorBar
              value={entry.appearances}
              max={maxAppearances}
              color={entry.color}
              muted={!entry.isActive}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

export function ManaColorPairs({ pairs, language, labels }: ManaColorPairsProps) {
  if (pairs.length === 0) {
    return <Text style={styles.emptyText}>{labels.emptyLabel}</Text>;
  }

  const maxAppearances = Math.max(...pairs.map((pair) => pair.appearances), 1);

  return (
    <View style={styles.pairs}>
      <Text style={styles.pairsHint}>{labels.pairsHint}</Text>
      {pairs.map((pair, index) => {
        const identityLabel = pair.guildName
          ? pair.guildName[language]
          : pair.colors.length === 5
            ? labels.pentacolor
            : pair.colors.join(' / ');

        return (
          <View key={pair.key} style={styles.pairCard}>
            <View style={styles.pairHeader}>
              <View style={styles.pairRank}>
                <Text style={styles.pairRankText}>{index + 1}</Text>
              </View>
              <ManaColorPills colors={pair.colors} />
              <Text style={styles.pairTitle} numberOfLines={2}>{identityLabel}</Text>
              <Text style={styles.pairStats}>{pair.winRate}%</Text>
            </View>
            <Text style={styles.pairMeta}>{pair.appearances}G · {pair.wins}W</Text>
            <ColorBar value={pair.appearances} max={maxAppearances} color={pair.colors[0]} />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  report: {
    gap: 12,
  },
  emptyWrap: {
    gap: 12,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    paddingVertical: 16,
  },
  legend: {
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    padding: 12,
  },
  legendTitle: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendLabel: {
    color: colors.muted,
    fontSize: 11,
  },
  warning: {
    color: colors.amber,
    fontSize: 12,
    lineHeight: 17,
  },
  sortRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  sortLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  sortChip: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.surfaceRaised,
  },
  sortChipActive: {
    borderColor: colors.primaryLight,
    backgroundColor: colors.primarySurface,
  },
  sortChipLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  sortChipLabelActive: {
    color: colors.foreground,
  },
  table: {
    gap: 10,
  },
  row: {
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    padding: 12,
  },
  rowMuted: {
    opacity: 0.55,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowTitleWrap: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: '600',
  },
  rowTitleMuted: {
    color: colors.muted,
  },
  rowSubtitle: {
    color: colors.muted,
    fontSize: 11,
  },
  rowWinRate: {
    color: colors.primaryMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  statsLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statsValue: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: '600',
  },
  statsMeta: {
    color: colors.muted,
    fontSize: 12,
    flex: 1,
  },
  statsWins: {
    color: colors.muted,
    fontSize: 12,
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceTrack,
    overflow: 'hidden',
  },
  barTrackMuted: {
    backgroundColor: colors.surfaceTrackMuted,
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  pairs: {
    gap: 10,
  },
  pairsHint: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  pairCard: {
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    padding: 12,
  },
  pairHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pairRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pairRankText: {
    color: colors.primaryMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  pairTitle: {
    flex: 1,
    color: colors.foreground,
    fontSize: 13,
    fontWeight: '600',
  },
  pairStats: {
    color: colors.primaryMuted,
    fontSize: 14,
    fontWeight: '700',
  },
  pairMeta: {
    color: colors.muted,
    fontSize: 12,
  },
});