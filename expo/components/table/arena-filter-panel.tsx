import { type ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { FilterChip } from '@/components/ui/filter-chip';
import { FilterPanel } from '@/components/ui/filter-panel';
import { spacing } from '@/constants/theme';
import type { ArenaDateFilter } from '@/lib/arena-filters';
import type { DeckStatsSort } from '@/lib/arena-deck-stats';

type ArenaTab = 'matches' | 'players' | 'decks' | 'meta';

type ArenaFilterPanelProps = {
  activeTab: ArenaTab;
  dateFilter: ArenaDateFilter;
  bracketFilter: string;
  deckStatsSort: DeckStatsSort;
  bracketOptions: string[];
  dateFilters: ArenaDateFilter[];
  dateFilterLabels: Record<ArenaDateFilter, string>;
  deckSortLabels: Record<DeckStatsSort, string>;
  labels: {
    filterPeriod: string;
    bracket: string;
    allBrackets: string;
    sortBy: string;
  };
  onDateFilterChange: (filter: ArenaDateFilter) => void;
  onBracketFilterChange: (bracket: string) => void;
  onDeckStatsSortChange: (sort: DeckStatsSort) => void;
};

function ChipRow({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {children}
    </ScrollView>
  );
}

export function ArenaFilterPanel({
  activeTab,
  dateFilter,
  bracketFilter,
  deckStatsSort,
  bracketOptions,
  dateFilters,
  dateFilterLabels,
  deckSortLabels,
  labels,
  onDateFilterChange,
  onBracketFilterChange,
  onDeckStatsSortChange,
}: ArenaFilterPanelProps) {
  const groups = [
    {
      key: 'period',
      title: labels.filterPeriod,
      content: (
        <ChipRow>
          {dateFilters.map((filter) => (
            <FilterChip
              key={filter}
              label={dateFilterLabels[filter]}
              active={dateFilter === filter}
              onPress={() => onDateFilterChange(filter)}
            />
          ))}
        </ChipRow>
      ),
    },
  ];

  if (activeTab === 'decks' || activeTab === 'meta') {
    groups.push({
      key: 'bracket',
      title: labels.bracket,
      content: (
        <ChipRow>
          <FilterChip
            label={labels.allBrackets}
            active={bracketFilter === 'all'}
            onPress={() => onBracketFilterChange('all')}
          />
          {bracketOptions.map((bracket) => (
            <FilterChip
              key={bracket}
              label={`${labels.bracket} ${bracket}`}
              active={bracketFilter === bracket}
              onPress={() => onBracketFilterChange(bracket)}
            />
          ))}
        </ChipRow>
      ),
    });
  }

  if (activeTab === 'decks') {
    groups.push({
      key: 'sort',
      title: labels.sortBy,
      content: (
        <ChipRow>
          {(['winRate', 'gamesPlayed', 'wins'] as DeckStatsSort[]).map((sort) => (
            <FilterChip
              key={sort}
              label={deckSortLabels[sort]}
              active={deckStatsSort === sort}
              onPress={() => onDeckStatsSortChange(sort)}
            />
          ))}
        </ChipRow>
      ),
    });
  }

  return <FilterPanel groups={groups} />;
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
    paddingVertical: 2,
  },
});