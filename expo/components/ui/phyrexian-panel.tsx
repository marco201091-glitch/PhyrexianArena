import { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radii, shadows } from '@/constants/theme';

type PhyrexianPanelProps = PropsWithChildren<{
  variant?: 'default' | 'strong' | 'inset' | 'modal';
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}>;

export function PhyrexianPanel({
  children,
  variant = 'default',
  style,
  padded = true,
}: PhyrexianPanelProps) {
  if (variant === 'modal') {
    return (
      <View style={[styles.modal, shadows.modal, padded && styles.padded, style]}>
        <View pointerEvents="none" style={styles.modalAccentTop} />
        {children}
      </View>
    );
  }

  if (variant === 'strong') {
    return (
      <View style={[styles.strong, shadows.panelStrong, padded && styles.padded, style]}>
        <View pointerEvents="none" style={styles.strongAccentTop} />
        {children}
      </View>
    );
  }

  if (variant === 'inset') {
    return (
      <View style={[styles.inset, padded && styles.padded, style]}>
        {children}
      </View>
    );
  }

  return (
    <View style={[styles.default, shadows.panel, padded && styles.padded, style]}>
      <View pointerEvents="none" style={styles.defaultAccentTop} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  default: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  defaultAccentTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(91, 33, 182, 0.45)',
  },
  strong: {
    backgroundColor: colors.cardElevated,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderViolet,
    overflow: 'hidden',
  },
  strongAccentTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.primaryDark,
  },
  inset: {
    backgroundColor: colors.cardInset,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    overflow: 'hidden',
  },
  modal: {
    backgroundColor: colors.modalSurface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderViolet,
    overflow: 'hidden',
  },
  modalAccentTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.primary,
  },
  padded: {
    padding: radii.lg,
  },
});