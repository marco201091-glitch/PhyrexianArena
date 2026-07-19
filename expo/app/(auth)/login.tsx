import { Href, Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Screen } from '@/components/ui/screen';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AuthBranding } from '@/components/auth/auth-branding';
import { PhyrexianPanel } from '@/components/ui/phyrexian-panel';
import { t } from '@/lib/i18n/translations';
import { getRememberMePreference, setRememberMePreference } from '@/lib/auth-persistence';
import { showAppAlert } from '@/lib/app-alert';
import { supabase } from '@/lib/supabase';
import { colors } from '@/constants/theme';
import { signInWithGoogleOnAndroid } from '@/lib/google-auth';

function resolveRedirectPath(redirect: string | string[] | undefined): Href {
  const value = Array.isArray(redirect) ? redirect[0] : redirect;
  if (value && value.startsWith('/')) {
    return value as Href;
  }
  return '/(tabs)';
}

export default function LoginScreen() {
  const copy = (key: Parameters<typeof t>[1]) => t('en', key);
  const router = useRouter();
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  const redirectPath = resolveRedirectPath(redirect);
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  useEffect(() => {
    void getRememberMePreference().then(setRememberMe);
  }, []);

  const handleRememberMeChange = (value: boolean) => {
    setRememberMe(value);
    void setRememberMePreference(value);
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      const trimmedIdentifier = loginIdentifier.trim();
      const isEmail = trimmedIdentifier.includes('@');
      let authEmail = trimmedIdentifier;

      if (!isEmail) {
        const { data, error } = await supabase.rpc('resolve_login_email', {
          identifier: trimmedIdentifier,
        });
        if (error) throw error;
        if (!data) throw new Error(copy('invalidCredentials'));
        authEmail = data;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password,
      });

      if (error) {
        if (error.message.toLowerCase().includes('email not confirmed')) {
          router.push('/(auth)/resend-confirmation');
          return;
        }
        throw error;
      }

      router.replace(redirectPath);
    } catch {
      showAppAlert(copy('error'), copy('invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const result = await signInWithGoogleOnAndroid();
      if (result === 'success') router.replace(redirectPath);
    } catch {
      showAppAlert(copy('error'), 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen background="solid">
      <AuthBranding forceEnglish />

      <PhyrexianPanel variant="strong" style={styles.formPanel}>
        <View style={styles.form}>
          <Input
            label={copy('emailOrUsername')}
            autoCapitalize="none"
            value={loginIdentifier}
            onChangeText={setLoginIdentifier}
          />
          <Input
            label={copy('password')}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <View style={styles.rememberRow}>
            <Text style={styles.rememberLabel}>{copy('rememberMe')}</Text>
            <Switch
              value={rememberMe}
              onValueChange={handleRememberMeChange}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.foreground}
            />
          </View>
          <Link href="/(auth)/forgot-password" asChild>
            <Pressable>
              <Text style={styles.link}>{copy('forgotPassword')}</Text>
            </Pressable>
          </Link>
          <Button
            label={loading ? copy('signingIn') : copy('enterArena')}
            onPress={handleLogin}
            disabled={loading}
          />
          {Platform.OS === 'android' ? (
            <Button
              label="Continue with Google"
              icon="logo-google"
              variant="outline"
              onPress={handleGoogleLogin}
              disabled={loading}
            />
          ) : null}
          <Button
            label="Quick game"
            icon="heart-outline"
            variant="outline"
            onPress={() => router.push('/counter' as Href)}
          />
        </View>
      </PhyrexianPanel>

      <Text style={styles.footer}>
        {copy('noAccount')}{' '}
        <Link
          href={{
            pathname: '/(auth)/register',
            params: redirect ? { redirect: Array.isArray(redirect) ? redirect[0] : redirect } : undefined,
          }}
          style={styles.footerLink}
        >
          {copy('register')}
        </Link>
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  formPanel: {
    marginTop: 8,
  },
  form: {
    gap: 16,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rememberLabel: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  link: {
    color: colors.primaryLight,
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    color: colors.muted,
    textAlign: 'center',
    marginTop: 24,
  },
  footerLink: {
    color: colors.primaryLight,
    fontWeight: '700',
  },
});
