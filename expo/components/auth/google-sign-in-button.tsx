import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { colors, radii } from '@/constants/theme';

type GoogleSignInButtonProps = {
  label: string;
  disabled?: boolean;
  onPress: () => void | Promise<void>;
};

export function GoogleSignInButton({ label, disabled, onPress }: GoogleSignInButtonProps) {
  return (
    <Pressable
      onPress={() => void onPress()}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <AntDesign name="google" size={18} color="#4285F4" />
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  label: {
    color: colors.foreground,
    fontSize: 15,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    backgroundColor: colors.surfaceMuted,
  },
});