import { Href, Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { HCaptchaField } from '@/components/auth/hcaptcha-field';
import { isPasswordPolicyValid, PasswordRequirements } from '@/components/auth/password-requirements';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { AuthBranding } from '@/components/auth/auth-branding';
import { PhyrexianPanel } from '@/components/ui/phyrexian-panel';
import { useLanguage } from '@/contexts/language-context';
import { apiPost } from '@/lib/api';
import { showAppAlert } from '@/lib/app-alert';
import { isValidEmail, isValidUsername } from '@/lib/auth-validation';
import { supabase } from '@/lib/supabase';
import { colors } from '@/constants/theme';

function resolveRedirectPath(redirect: string | string[] | undefined): Href {
  const value = Array.isArray(redirect) ? redirect[0] : redirect;
  if (value && value.startsWith('/')) {
    return value as Href;
  }
  return '/(tabs)';
}

export default function RegisterScreen() {
  const { copy, language } = useLanguage();
  const router = useRouter();
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  const redirectPath = resolveRedirectPath(redirect);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaResetSignal, setCaptchaResetSignal] = useState(0);
  const [loading, setLoading] = useState(false);

  const resetCaptcha = () => {
    setCaptchaToken('');
    setCaptchaResetSignal((value) => value + 1);
  };

  const handleRegister = async () => {
    if (!isValidUsername(username)) {
      showAppAlert(copy('error'), copy('invalidUsername'));
      return;
    }
    if (!isValidEmail(email)) {
      showAppAlert(copy('error'), copy('invalidEmail'));
      return;
    }
    if (!isPasswordPolicyValid(password)) {
      showAppAlert(copy('error'), copy('weakPassword'));
      return;
    }
    if (!captchaToken) {
      showAppAlert(copy('error'), copy('captchaRequired'));
      return;
    }

    setLoading(true);
    try {
      const { error } = await apiPost('/api/auth/register', {
        email: email.trim(),
        password,
        username: username.trim(),
        captchaToken,
        locale: language,
      });

      if (error) throw new Error(error);

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) {
        router.replace({
          pathname: '/(auth)/check-email',
          params: { email: email.trim().toLowerCase() },
        });
        return;
      }

      router.replace(redirectPath);
    } catch (error) {
      resetCaptcha();
      showAppAlert(
        copy('error'),
        error instanceof Error ? error.message : copy('error'),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen background="solid">
      <AuthBranding />
      <Text style={styles.title}>{copy('register')}</Text>

      <PhyrexianPanel variant="strong" style={styles.formPanel}>
        <View style={styles.form}>
          <Input label={copy('username')} autoCapitalize="none" value={username} onChangeText={setUsername} />
          <Input label={copy('email')} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
          <Input label={copy('password')} secureTextEntry value={password} onChangeText={setPassword} />
          <PasswordRequirements password={password} />
          <HCaptchaField
            resetSignal={captchaResetSignal}
            languageCode={language}
            onVerify={setCaptchaToken}
            onExpire={() => setCaptchaToken('')}
            onError={resetCaptcha}
            unavailableLabel={copy('captchaRequired')}
            verifyLabel={copy('captchaTapToVerify')}
            verifiedLabel={copy('captchaVerified')}
            errorLabel={copy('captchaFailed')}
          />
          <Button
            label={loading ? copy('creatingAccount') : copy('createAccount')}
            onPress={handleRegister}
            disabled={loading}
          />
        </View>
      </PhyrexianPanel>

      <Text style={styles.terms}>
        {copy('registerTermsPrefix')}
        <Link href={{ pathname: '/legal/[slug]', params: { slug: 'terms' } }} style={styles.footerLink}>{copy('termsOfUse')}</Link>
        {copy('registerTermsAnd')}
        <Link href={{ pathname: '/legal/[slug]', params: { slug: 'privacy' } }} style={styles.footerLink}>{copy('privacyPolicy')}</Link>
        {copy('registerTermsCookies')}
        <Link href={{ pathname: '/legal/[slug]', params: { slug: 'cookies' } }} style={styles.footerLink}>{copy('cookiePolicy')}</Link>
        .
      </Text>

      <Text style={styles.footer}>
        {copy('hasAccount')}{' '}
        <Link
          href={{
            pathname: '/(auth)/login',
            params: redirect ? { redirect: Array.isArray(redirect) ? redirect[0] : redirect } : undefined,
          }}
          style={styles.footerLink}
        >
          {copy('login')}
        </Link>
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', gap: 16, marginBottom: 20, marginTop: 12 },
  title: { color: colors.foreground, fontSize: 28, fontWeight: '700' },
  formPanel: { marginTop: 8 },
  form: { gap: 16 },
  terms: { color: colors.muted, textAlign: 'center', marginTop: 20, fontSize: 12, lineHeight: 18 },
  footer: { color: colors.muted, textAlign: 'center', marginTop: 16 },
  footerLink: { color: colors.primaryLight, fontWeight: '700' },
});
