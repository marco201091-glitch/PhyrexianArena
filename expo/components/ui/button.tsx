import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, touch } from '@/constants/theme';
import { layout } from '@/lib/layout';

type ButtonVariant = 'primary' | 'ghost' | 'outline' | 'destructive';
type ButtonSize = 'default' | 'sm';

type ButtonProps = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
};

export function Button({
  label,
  onPress,
  disabled,
  variant = 'primary',
  size = 'default',
  icon,
  style,
}: ButtonProps) {
  const isPrimary = variant === 'primary';
  const isDestructive = variant === 'destructive';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      hitSlop={size === 'sm' ? 4 : 2}
      android_ripple={{ color: 'rgba(255,255,255,0.12)', borderless: false }}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' && styles.sm,
        variant === 'primary' && styles.primary,
        variant === 'ghost' && styles.ghost,
        variant === 'outline' && styles.outline,
        variant === 'destructive' && styles.destructive,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={size === 'sm' ? 16 : 18}
          color={isPrimary ? '#fff' : isDestructive ? colors.destructive : colors.foreground}
          style={styles.icon}
        />
      ) : null}
      <Text
        style={[
          styles.label,
          size === 'sm' && styles.labelSm,
          !isPrimary && !isDestructive && styles.secondaryLabel,
          isDestructive && styles.destructiveLabel,
        ]}
        maxFontSizeMultiplier={layout.maxFontSizeMultiplier}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.86}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touch.minHeight,
    borderRadius: radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  sm: {
    minHeight: 36,
    paddingHorizontal: 12,
  },
  primary: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  ghost: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  outline: {
    backgroundColor: 'rgba(12, 12, 20, 0.4)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  destructive: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.94,
    transform: [{ scale: 0.985 }, { translateY: 1 }],
  },
  icon: {},
  label: {
    flexShrink: 1,
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    textAlign: 'center',
  },
  labelSm: {
    fontSize: 14,
  },
  secondaryLabel: {
    color: colors.foreground,
  },
  destructiveLabel: {
    color: colors.destructive,
  },
});
