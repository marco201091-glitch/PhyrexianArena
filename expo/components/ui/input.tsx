import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors, radii, touch } from '@/constants/theme';
import { layout } from '@/lib/layout';

type InputProps = TextInputProps & {
  label?: string;
  error?: string;
};

export function Input({ label, error, ...props }: InputProps) {
  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text style={styles.label} maxFontSizeMultiplier={layout.maxFontSizeMultiplier}>
          {label}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor={colors.muted}
        style={[styles.input, props.editable === false && styles.disabled]}
        maxFontSizeMultiplier={layout.maxFontSizeMultiplier}
        {...props}
      />
      {error ? (
        <Text style={styles.error} maxFontSizeMultiplier={layout.maxFontSizeMultiplier}>
          {error}
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
  input: {
    minHeight: touch.minHeight,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.inputBg,
    color: colors.foreground,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  disabled: {
    opacity: 0.6,
  },
  error: {
    color: colors.destructive,
    fontSize: 12,
  },
});