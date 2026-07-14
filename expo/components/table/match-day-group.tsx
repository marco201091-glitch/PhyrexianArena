import { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/button';
import { PhyrexianPanel } from '@/components/ui/phyrexian-panel';
import { colors, spacing } from '@/constants/theme';

type MatchDayGroupProps = PropsWithChildren<{
  label: string;
  matchCount: number;
  matchCountLabel: string;
  exportLabel: string;
  expanded: boolean;
  onToggle: (open: boolean) => void;
  onExport: () => void;
}>;

export function MatchDayGroup({
  label,
  matchCount,
  matchCountLabel,
  exportLabel,
  expanded,
  onToggle,
  onExport,
  children,
}: MatchDayGroupProps) {
  return (
    <PhyrexianPanel variant="inset" padded={false} style={styles.panel}>
      <View style={styles.header}>
        <Pressable
          style={styles.toggle}
          onPress={() => onToggle(!expanded)}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
        >
          <Ionicons
            name="chevron-down"
            size={18}
            color={colors.muted}
            style={[styles.chevron, expanded && styles.chevronExpanded]}
          />
          <View style={styles.toggleText}>
            <Text style={styles.dayLabel}>{label}</Text>
            <Text style={styles.matchCount}>
              · {matchCount} {matchCountLabel}
            </Text>
          </View>
        </Pressable>
        <Button
          label={exportLabel}
          variant="outline"
          size="sm"
          icon="download-outline"
          onPress={onExport}
          style={styles.exportButton}
        />
      </View>
      {expanded ? <View style={styles.content}>{children}</View> : null}
    </PhyrexianPanel>
  );
}

const styles = StyleSheet.create({
  panel: {
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  exportButton: {
    flexShrink: 0,
  },
  toggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
  },
  chevron: {
    transform: [{ rotate: '0deg' }],
  },
  chevronExpanded: {
    transform: [{ rotate: '180deg' }],
  },
  toggleText: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    gap: 4,
  },
  dayLabel: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: '600',
  },
  matchCount: {
    color: colors.muted,
    fontSize: 14,
  },
  content: {
    gap: spacing.md,
    padding: spacing.md,
  },
});