import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TurnstileField } from '@/components/auth/turnstile-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthBranding } from '@/components/auth/auth-branding';
import { PhyrexianPanel } from '@/components/ui/phyrexian-panel';
import { Screen } from '@/components/ui/screen';
import { useLanguage } from '@/contexts/language-context';
import { useToast } from '@/contexts/toast-context';
import { apiPost } from '@/lib/api';
import { showAppAlert } from '@/lib/app-alert';
import { isValidEmail } from '@/lib/auth-validation';
import { colors } from '@/constants/theme';

export default function ResendConfirmationScreen() {
  const { copy, language } = useLanguage();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaResetSignal, setCaptchaResetSignal] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!isValidEmail(email)) {
      showAppAlert(copy('error'), copy('invalidEmail'));
      return;
    }
    if (!captchaToken) {
      showAppAlert(language === 'it' ? 'Attenzione' : 'Notice', copy('captchaRequired'));
      return;
    }

    setLoading(true);
    try {
      const { error } = await apiPost('/api/auth/resend-confirmation', {
        email: email.trim().toLowerCase(),
        captchaToken,
      });
      if (error) throw new Error(error);
      showToast(copy('confirmationEmailSent'));
    } catch (error) {
      setCaptchaToken('');
      setCaptchaResetSignal((value) => value + 1);
      showAppAlert(copy('error'), error instanceof Error ? error.message : copy('error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen background="solid">
      <AuthBranding />
      <PhyrexianPanel variant="strong">
        <Text style={styles.title}>{copy('resendConfirmationTitle')}</Text>
        <View style={styles.form}>
          <Input label={copy('email')} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
          <TurnstileField
            resetSignal={captchaResetSignal}
            languageCode={language}
            onVerify={setCaptchaToken}
            onExpire={() => setCaptchaToken('')}
            unavailableLabel={copy('captchaRequired')}
            verifyLabel={copy('captchaTapToVerify')}
            verifiedLabel={copy('captchaVerified')}
            errorLabel={copy('captchaFailed')}
          />
          <Button
            label={loading ? copy('loading') : copy('sendConfirmationEmail')}
            onPress={handleSubmit}
            disabled={loading}
          />
        </View>
      </PhyrexianPanel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.foreground, fontSize: 24, fontWeight: '700', marginBottom: 8 },
  form: { gap: 16 },
});
