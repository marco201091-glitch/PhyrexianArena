import { PropsWithChildren, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { PhyrexianPanel } from '@/components/ui/phyrexian-panel';
import { colors, spacing } from '@/constants/theme';

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
  return (
    <PhyrexianPanel variant={variant} padded={false} style={style}>
      <View style={styles.body}>{children}</View>
      <View style={styles.actions}>{actions}</View>
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
});