import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, touch } from '@/constants/theme';
import { layout } from '@/lib/layout';

type InputProps = TextInputProps & {
  label?: string;
  error?: string;
  hint?: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

export function Input({ label, error, hint, icon, style, accessibilityLabel, accessibilityHint, ...props }: InputProps) {
  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text style={styles.label} maxFontSizeMultiplier={layout.maxFontSizeMultiplier}>
          {label}
        </Text>
      ) : null}
      <View style={[
        styles.inputShell,
        error && styles.inputShellError,
        props.editable === false && styles.disabled,
      ]}>
        {icon ? <Ionicons name={icon} size={19} color={colors.muted} /> : null}
        <TextInput
          placeholderTextColor={colors.muted}
          selectionColor={colors.primaryLight}
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityHint={accessibilityHint ?? error ?? hint}
          accessibilityState={{ disabled: props.editable === false }}
          style={[styles.input, props.multiline && styles.inputMultiline, style]}
          maxFontSizeMultiplier={layout.maxFontSizeMultiplier}
          {...props}
        />
        {error ? <Ionicons name="alert-circle" size={18} color={colors.destructive} /> : null}
      </View>
      {error ? (
        <Text style={styles.error} maxFontSizeMultiplier={layout.maxFontSizeMultiplier}>
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.hint} maxFontSizeMultiplier={layout.maxFontSizeMultiplier}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  label: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: '600',
  },
  inputShell: {
    minHeight: touch.minHeight,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.inputBg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
  },
  inputShellError: {
    borderColor: colors.destructive,
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: touch.minHeight - 2,
    color: colors.foreground,
    paddingHorizontal: 0,
    paddingVertical: 10,
    fontSize: 16,
  },
  inputMultiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  disabled: {
    opacity: 0.6,
  },
  error: {
    color: colors.destructive,
    fontSize: 12,
  },
  hint: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
  },
});
