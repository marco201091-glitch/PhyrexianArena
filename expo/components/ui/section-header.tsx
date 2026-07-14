import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, spacing, typography } from '@/constants/theme';

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  trailing?: string;
  style?: StyleProp<ViewStyle>;
};

export function SectionHeader({ title, subtitle, trailing, style }: SectionHeaderProps) {
  return (
    <View style={[styles.root, style]}>
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {trailing ? <Text style={styles.trailing}>{trailing}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  text: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: colors.foreground,
    fontSize: typography.subtitle.fontSize,
    fontWeight: typography.subtitle.fontWeight,
  },
  subtitle: {
    color: colors.muted,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
  },
  trailing: {
    color: colors.muted,
    fontSize: typography.caption.fontSize,
  },
});