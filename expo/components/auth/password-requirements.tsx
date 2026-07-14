import { StyleSheet, Text, View } from 'react-native';
import { isStrongPassword } from '@/lib/auth-validation';
import { useLanguage } from '@/contexts/language-context';
import { colors } from '@/constants/theme';

export function isPasswordPolicyValid(password: string) {
  return isStrongPassword(password);
}

export function PasswordRequirements({ password }: { password: string }) {
  const { copy } = useLanguage();

  const checks = [
    { valid: password.length >= 8, label: copy('weakPassword').split('.')[0] || '>= 8 chars' },
    { valid: /[A-Z]/.test(password), label: 'A-Z' },
    { valid: /[a-z]/.test(password), label: 'a-z' },
    { valid: /\d/.test(password), label: '0-9' },
  ];

  return (
    <View style={styles.grid}>
      {checks.map((check) => (
        <Text key={check.label} style={[styles.item, check.valid && styles.valid]}>
          {check.valid ? 'OK' : '-'} {check.label}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: 4,
  },
  item: {
    color: colors.muted,
    fontSize: 12,
  },
  valid: {
    color: colors.success,
  },
});