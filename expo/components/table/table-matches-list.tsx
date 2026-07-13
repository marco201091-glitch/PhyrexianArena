import { FlatList, StyleSheet, View } from 'react-native';
import { MatchCard } from '@/components/table/match-card';
import { MatchDayGroup } from '@/components/table/match-day-group';
import { EmptyState } from '@/components/ui/empty-state';
import { spacing } from '@/constants/theme';
import type { ArenaMatch } from '@/lib/types/arena';

export type MatchDayGroupData = {
  dayKey: string;
  label: string;
  matchCount: number;
  matches: ArenaMatch[];
};

type TableMatchesListProps = {
  dayGroups: MatchDayGroupData[];
  expandedDayKeys: Set<string>;
  emptyTitle: string;
  emptyBody: string;
  recordBattleLabel: string;
  matchCountLabel: (count: number) => string;
  onToggleDay: (dayKey: string, open: boolean) => void;
  onEditMatch: (match: ArenaMatch) => void;
  onShareMatch: (match: ArenaMatch) => void;
  onDeleteMatch: (matchId: string) => void;
  onRecordBattle: () => void;
  exportDayLabel: string;
  onExportDay: (dayKey: string) => void;
};

export function TableMatchesList({
  dayGroups,
  expandedDayKeys,
  emptyTitle,
  emptyBody,
  recordBattleLabel,
  matchCountLabel,
  onToggleDay,
  onEditMatch,
  onShareMatch,
  onDeleteMatch,
  onRecordBattle,
  exportDayLabel,
  onExportDay,
}: TableMatchesListProps) {
  if (dayGroups.length === 0) {
    return (
      <EmptyState
        icon="trophy-outline"
        title={emptyTitle}
        body={emptyBody}
        actionLabel={recordBattleLabel}
        onAction={onRecordBattle}
      />
    );
  }

  return (
    <FlatList
      data={dayGroups}
      keyExtractor={(item) => item.dayKey}
      scrollEnabled={false}
      contentContainerStyle={styles.list}
      renderItem={({ item: dayGroup }) => (
        <MatchDayGroup
          label={dayGroup.label}
          matchCount={dayGroup.matchCount}
          matchCountLabel={matchCountLabel(dayGroup.matchCount)}
          exportLabel={exportDayLabel}
          expanded={expandedDayKeys.has(dayGroup.dayKey)}
          onToggle={(open) => onToggleDay(dayGroup.dayKey, open)}
          onExport={() => onExportDay(dayGroup.dayKey)}
        >
          {dayGroup.matches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              onEdit={() => onEditMatch(match)}
              onShare={() => onShareMatch(match)}
              onDelete={() => onDeleteMatch(match.id)}
            />
          ))}
        </MatchDayGroup>
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.md,
  },
  separator: {
    height: spacing.md,
  },
});