import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radii, typography } from '@/constants/theme';

type FilterChipProps = {
  label: string;
  active?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

export function FilterChip({ label, active = false, onPress, style }: FilterChipProps) {
  return (
    <Pressable
      style={[styles.chip, active && styles.chipActive, style]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipActive: {
    borderColor: colors.primaryLight,
    backgroundColor: colors.primarySurface,
  },
  label: {
    color: colors.muted,
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
  },
  labelActive: {
    color: colors.foreground,
  },
});