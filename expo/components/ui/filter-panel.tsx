import { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PhyrexianPanel } from '@/components/ui/phyrexian-panel';
import { colors, spacing } from '@/constants/theme';

export type FilterPanelGroup = {
  key: string;
  title: string;
  content: ReactNode;
};

type FilterPanelProps = {
  groups: FilterPanelGroup[];
  actions?: ReactNode;
};

export function FilterPanel({ groups, actions }: FilterPanelProps) {
  return (
    <PhyrexianPanel variant="inset" padded={false}>
      {actions ? <View style={styles.actions}>{actions}</View> : null}
      {groups.map((group, index) => (
        <View
          key={group.key}
          style={[styles.group, index === groups.length - 1 && styles.groupLast]}
        >
          <Text style={styles.groupLabel}>{group.title}</Text>
          {group.content}
        </View>
      ))}
    </PhyrexianPanel>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  group: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  groupLast: {
    borderBottomWidth: 0,
  },
  groupLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});