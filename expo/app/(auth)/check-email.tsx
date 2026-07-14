import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { AuthBranding } from '@/components/auth/auth-branding';
import { Screen } from '@/components/ui/screen';
import { useLanguage } from '@/contexts/language-context';
import { colors } from '@/constants/theme';

export default function CheckEmailScreen() {
  const { email, mode } = useLocalSearchParams<{ email?: string; mode?: string }>();
  const resolvedEmail = Array.isArray(email) ? email[0] : email;
  const isReset = (Array.isArray(mode) ? mode[0] : mode) === 'reset';
  const { copy } = useLanguage();
  const router = useRouter();

  const resendPath = isReset ? '/(auth)/forgot-password' : '/(auth)/resend-confirmation';

  return (
    <Screen background="solid">
      <AuthBranding />
      <View style={styles.card}>
        <Text style={styles.title}>
          {isReset ? copy('checkEmailReset') : copy('checkEmailSignup')}
        </Text>
        <Text style={styles.body}>
          {isReset ? copy('checkEmailResetBody') : copy('checkEmailSignupBody')}
        </Text>
        {resolvedEmail ? <Text style={styles.email}>{resolvedEmail}</Text> : null}
      </View>

      <View style={styles.actions}>
        <Button
          label={isReset ? copy('sendLinkAgain') : copy('resendConfirmation')}
          variant="ghost"
          onPress={() => router.push({
            pathname: resendPath,
            params: resolvedEmail ? { email: resolvedEmail } : undefined,
          })}
        />
        <Button label={copy('goToLogin')} onPress={() => router.push('/(auth)/login')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    gap: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  title: {
    color: colors.foreground,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  body: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  email: {
    color: colors.foreground,
    fontSize: 15,
    fontWeight: '600',
  },
  actions: {
    marginTop: 20,
    gap: 10,
  },
});