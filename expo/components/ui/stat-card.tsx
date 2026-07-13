import { StyleSheet, Text, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { PhyrexianPanel } from '@/components/ui/phyrexian-panel';
import { colors, spacing, typography } from '@/constants/theme';

type StatCardProps = {
  label: string;
  value: string | number;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
  valueColor?: string;
  /** Inset tiles for nested metric grids (no panel shadow). */
  inset?: boolean;
};

export function StatCard({
  label,
  value,
  style,
  compact = false,
  valueColor,
  inset = false,
}: StatCardProps) {
  const { width } = useWindowDimensions();
  const valueSize = compact ? 22 : width < 360 ? 26 : 30;
  const minHeight = compact ? 80 : 96;

  return (
    <PhyrexianPanel
      variant={inset ? 'inset' : 'default'}
      padded={false}
      style={[styles.card, { minHeight }, compact && styles.cardCompact, style]}
    >
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
      <Text
        style={[
          styles.value,
          { fontSize: valueSize, lineHeight: valueSize + 4 },
          valueColor ? { color: valueColor } : null,
        ]}
        numberOfLines={compact ? 2 : 1}
        adjustsFontSizeToFit={compact}
        minimumFontScale={0.75}
      >
        {value}
      </Text>
    </PhyrexianPanel>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  cardCompact: {
    paddingTop: spacing.sm + 2,
    paddingBottom: spacing.sm + 2,
  },
  label: {
    color: colors.muted,
    ...typography.label,
    lineHeight: 14,
    paddingRight: spacing.xs,
  },
  value: {
    color: colors.foreground,
    fontWeight: '700',
    alignSelf: 'stretch',
  },
});