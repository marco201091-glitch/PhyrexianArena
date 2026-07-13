import { PropsWithChildren, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PhyrexianPanel } from '@/components/ui/phyrexian-panel';
import { colors, spacing } from '@/constants/theme';

type CollapsiblePanelProps = PropsWithChildren<{
  title: string;
  meta?: string;
  defaultExpanded?: boolean;
  variant?: 'default' | 'strong';
}>;

export function CollapsiblePanel({
  title,
  meta,
  defaultExpanded = false,
  variant = 'default',
  children,
}: CollapsiblePanelProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <PhyrexianPanel variant={variant} padded={false} style={styles.panel}>
      <Pressable
        style={styles.header}
        onPress={() => setExpanded((current) => !current)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <Ionicons
          name="chevron-down"
          size={18}
          color={colors.muted}
          style={[styles.chevron, expanded && styles.chevronExpanded]}
        />
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          {meta ? <Text style={styles.meta}>{meta}</Text> : null}
        </View>
      </Pressable>
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    minHeight: 48,
  },
  chevron: {
    transform: [{ rotate: '0deg' }],
  },
  chevronExpanded: {
    transform: [{ rotate: '180deg' }],
  },
  headerText: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    gap: 6,
  },
  title: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: '700',
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
  },
  content: {
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    padding: spacing.md,
  },
});