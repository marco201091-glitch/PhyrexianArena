import { Pressable, StyleSheet, Text } from 'react-native';
import { ManaColorBadge } from '@/components/ui/mana-color-pills';
import { colors, radii } from '@/constants/theme';

type ManaColorFilterChipProps = {
  color?: string;
  label?: string;
  active?: boolean;
  onPress: () => void;
};

export function ManaColorFilterChip({
  color,
  label,
  active = false,
  onPress,
}: ManaColorFilterChipProps) {
  return (
    <Pressable
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      {color ? (
        <ManaColorBadge color={color} size="md" />
      ) : (
        <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
    minHeight: 40,
  },
  chipActive: {
    borderColor: colors.primaryLight,
    backgroundColor: colors.primarySurface,
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  labelActive: {
    color: colors.foreground,
  },
});