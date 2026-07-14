import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@/constants/theme';

type ScreenHeaderProps = {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  backLabel,
  style,
}: ScreenHeaderProps) {
  return (
    <View style={[styles.root, style]}>
      {onBack ? (
        <Pressable style={styles.backRow} onPress={onBack} accessibilityRole="button">
          <Ionicons name="arrow-back" size={18} color={colors.primaryMuted} />
          {backLabel ? <Text style={styles.backLabel}>{backLabel}</Text> : null}
        </Pressable>
      ) : null}
      {title ? (
        <View style={styles.text}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.sm,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  backLabel: {
    color: colors.primaryMuted,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  text: {
    gap: 4,
  },
  title: {
    color: colors.foreground,
    fontSize: typography.title.fontSize,
    fontWeight: typography.title.fontWeight,
  },
  subtitle: {
    color: colors.muted,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
  },
});