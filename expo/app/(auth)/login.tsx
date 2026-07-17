import { Href, Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Screen } from '@/components/ui/screen';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AuthBranding } from '@/components/auth/auth-branding';
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button';
import { PhyrexianPanel } from '@/components/ui/phyrexian-panel';
import { useLanguage } from '@/contexts/language-context';
import { getRememberMePreference, setRememberMePreference } from '@/lib/auth-persistence';
import { showAppAlert } from '@/lib/app-alert';
import { signInWithGoogle } from '@/lib/google-auth';
import { supabase } from '@/lib/supabase';
import { colors } from '@/constants/theme';

function resolveRedirectPath(redirect: string | string[] | undefined): Href {
  const value = Array.isArray(redirect) ? redirect[0] : redirect;
  if (value && value.startsWith('/')) {
    return value as Href;
  }
  return '/(tabs)';
}

export default function LoginScreen() {
  const { copy } = useLanguage();
  const router = useRouter();
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  const redirectPath = resolveRedirectPath(redirect);
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const authBusy = loading || googleLoading;

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

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const next = Array.isArray(redirect) ? redirect[0] : redirect;
      const redirectPath = await signInWithGoogle(next);
      router.replace(redirectPath as Href);
    } catch (error) {
      if (error instanceof Error && error.message === 'cancelled') {
        return;
      }
      if (__DEV__) {
        console.error('[google-auth] sign-in failed:', error);
      }
      showAppAlert(copy('error'), copy('googleSignInFailed'));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <Screen background="solid">
      <AuthBranding />

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
            disabled={authBusy}
          />
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerLabel}>{copy('orDivider')}</Text>
            <View style={styles.dividerLine} />
          </View>
          <GoogleSignInButton
            label={googleLoading ? copy('signingInWithGoogle') : copy('continueWithGoogle')}
            disabled={authBusy}
            onPress={handleGoogleSignIn}
          />
          <Button
            label="Partita veloce"
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
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
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
