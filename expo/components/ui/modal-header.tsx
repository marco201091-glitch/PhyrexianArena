import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '@/constants/theme';

type ModalTone = 'default' | 'danger' | 'success' | 'warning';

type ModalHeaderProps = {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: ModalTone;
  onClose?: () => void;
};

const toneColors: Record<ModalTone, { icon: string; surface: string; border: string }> = {
  default: {
    icon: colors.primaryMuted,
    surface: colors.selectionTint,
    border: colors.selectionBorder,
  },
  danger: {
    icon: colors.destructive,
    surface: 'rgba(239, 68, 68, 0.10)',
    border: 'rgba(239, 68, 68, 0.28)',
  },
  success: {
    icon: colors.success,
    surface: 'rgba(52, 211, 153, 0.10)',
    border: 'rgba(52, 211, 153, 0.26)',
  },
  warning: {
    icon: colors.amber,
    surface: 'rgba(251, 191, 36, 0.10)',
    border: 'rgba(251, 191, 36, 0.26)',
  },
};

export function ModalHeader({
  title,
  subtitle,
  icon = 'sparkles-outline',
  tone = 'default',
  onClose,
}: ModalHeaderProps) {
  const palette = toneColors[tone];

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}
      >
        <Ionicons name={icon} size={22} color={palette.icon} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {onClose ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={8}
          onPress={onClose}
          style={({ pressed }) => [styles.close, pressed && styles.closePressed]}
        >
          <Ionicons name="close" size={21} color={colors.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    minWidth: 0,
    paddingTop: 1,
  },
  title: {
    color: colors.foreground,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
  },
  close: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closePressed: {
    opacity: 0.72,
  },
});
