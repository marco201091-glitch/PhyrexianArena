import { Href, Link, useLocalSearchParams, useRouter } from 'expo-router';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TurnstileField } from '@/components/auth/turnstile-field';
import { PasswordRequirements } from '@/components/auth/password-requirements';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { AuthBranding } from '@/components/auth/auth-branding';
import { PhyrexianPanel } from '@/components/ui/phyrexian-panel';
import { useLanguage } from '@/contexts/language-context';
import { apiPost } from '@/lib/api';
import { showAppAlert } from '@/lib/app-alert';
import { supabase } from '@/lib/supabase';
import { registerSchema, type RegisterValues } from '@/lib/validation/auth';
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
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaResetSignal, setCaptchaResetSignal] = useState(0);
  const [loading, setLoading] = useState(false);
  const { control, handleSubmit, formState: { errors } } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: '', email: '', password: '' },
    mode: 'onBlur',
  });
  const password = useWatch({ control, name: 'password' });

  const resetCaptcha = () => {
    setCaptchaToken('');
    setCaptchaResetSignal((value) => value + 1);
  };

  const handleRegister = async ({ username, email, password }: RegisterValues) => {
    if (!captchaToken) {
      showAppAlert(language === 'it' ? 'Attenzione' : 'Notice', copy('captchaRequired'));
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
        throw signInError;
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
          <Controller control={control} name="username" render={({ field: { onChange, onBlur, value } }) => <Input label={copy('username')} autoCapitalize="none" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.username ? copy('invalidUsername') : undefined} />} />
          <Controller control={control} name="email" render={({ field: { onChange, onBlur, value } }) => <Input label={copy('email')} autoCapitalize="none" keyboardType="email-address" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.email ? copy('invalidEmail') : undefined} />} />
          <Controller control={control} name="password" render={({ field: { onChange, onBlur, value } }) => <Input label={copy('password')} secureTextEntry value={value} onChangeText={onChange} onBlur={onBlur} error={errors.password ? copy('weakPassword') : undefined} />} />
          <PasswordRequirements password={password} />
          <TurnstileField
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
            onPress={() => void handleSubmit(handleRegister)()}
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
