import { PropsWithChildren, type ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import { PhyrexianPanel } from '@/components/ui/phyrexian-panel';
import { colors, spacing } from '@/constants/theme';
import { isCompactViewport } from '@/lib/layout';

type PanelWithActionsProps = PropsWithChildren<{
  actions: ReactNode;
  variant?: 'default' | 'strong' | 'inset';
  style?: StyleProp<ViewStyle>;
}>;

export function PanelWithActions({
  children,
  actions,
  variant = 'default',
  style,
}: PanelWithActionsProps) {
  const { width } = useWindowDimensions();
  const stackActions = isCompactViewport(width);

  return (
    <PhyrexianPanel variant={variant} padded={false} style={style}>
      <View style={styles.body}>{children}</View>
      <View style={[styles.actions, stackActions && styles.actionsStacked]}>{actions}</View>
    </PhyrexianPanel>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  actionsStacked: {
    flexDirection: 'column',
  },
});
