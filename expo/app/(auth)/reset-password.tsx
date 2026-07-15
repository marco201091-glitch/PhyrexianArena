import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { isPasswordPolicyValid, PasswordRequirements } from '@/components/auth/password-requirements';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader } from '@/components/ui/loader';
import { AuthBranding } from '@/components/auth/auth-branding';
import { Screen } from '@/components/ui/screen';
import { useLanguage } from '@/contexts/language-context';
import { colors } from '@/constants/theme';
import { showAppAlert } from '@/lib/app-alert';
import { supabase } from '@/lib/supabase';

function parseTokensFromUrl(url: string) {
  const parsed = Linking.parse(url);
  const code = typeof parsed.queryParams?.code === 'string' ? parsed.queryParams.code : null;
  const accessToken = typeof parsed.queryParams?.access_token === 'string'
    ? parsed.queryParams.access_token
    : null;
  const refreshToken = typeof parsed.queryParams?.refresh_token === 'string'
    ? parsed.queryParams.refresh_token
    : null;

  if (accessToken && refreshToken) {
    return { code: null, accessToken, refreshToken };
  }

  const hashIndex = url.indexOf('#');
  if (hashIndex >= 0) {
    const hashParams = new URLSearchParams(url.slice(hashIndex + 1));
    const hashAccessToken = hashParams.get('access_token');
    const hashRefreshToken = hashParams.get('refresh_token');
    if (hashAccessToken && hashRefreshToken) {
      return { code: null, accessToken: hashAccessToken, refreshToken: hashRefreshToken };
    }
  }

  return { code, accessToken: null, refreshToken: null };
}

export default function ResetPasswordScreen() {
  const { copy } = useLanguage();
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string; access_token?: string; refresh_token?: string }>();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const isPasswordValid = isPasswordPolicyValid(password);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  useEffect(() => {
    const establishSession = async (url?: string | null) => {
      try {
        let code = typeof params.code === 'string' ? params.code : null;
        let accessToken = typeof params.access_token === 'string' ? params.access_token : null;
        let refreshToken = typeof params.refresh_token === 'string' ? params.refresh_token : null;

        if (url) {
          const parsed = parseTokensFromUrl(url);
          code = code || parsed.code;
          accessToken = accessToken || parsed.accessToken;
          refreshToken = refreshToken || parsed.refreshToken;
        }

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        }

        const { data: { user } } = await supabase.auth.getUser();
        setSessionReady(Boolean(user));
      } catch {
        setSessionReady(false);
      } finally {
        setCheckingSession(false);
      }
    };

    void establishSession();
    void Linking.getInitialURL().then((initialUrl) => {
      if (initialUrl) {
        setCheckingSession(true);
        void establishSession(initialUrl);
      }
    });

    const subscription = Linking.addEventListener('url', ({ url }) => {
      setCheckingSession(true);
      void establishSession(url);
    });

    return () => subscription.remove();
  }, [params.access_token, params.code, params.refresh_token]);

  const handleSubmit = async () => {
    if (!isPasswordValid || !passwordsMatch) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      showAppAlert(copy('passwordUpdated'), copy('passwordUpdatedHint'));
      router.replace('/(tabs)');
    } catch (error) {
      showAppAlert(
        copy('error'),
        error instanceof Error ? error.message : copy('unableToUpdatePassword'),
      );
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return <Loader label={copy('verifyingLink')} />;
  }

  if (!sessionReady) {
    return (
      <Screen background="solid">
        <AuthBranding />
        <Text style={styles.title}>{copy('newPassword')}</Text>
        <Text style={styles.subtitle}>{copy('invalidResetLink')}</Text>
        <Button label={copy('requestNewLink')} onPress={() => router.push('/(auth)/forgot-password')} />
      </Screen>
    );
  }

  return (
    <Screen background="solid">
      <AuthBranding />
      <Text style={styles.title}>{copy('newPassword')}</Text>
      <Text style={styles.subtitle}>{copy('newPasswordHint')}</Text>

      <View style={styles.form}>
        <Input
          label={copy('password')}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          autoComplete="new-password"
        />
        <PasswordRequirements password={password} />
        <Input
          label={copy('confirmPassword')}
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          autoComplete="new-password"
        />
        {confirmPassword.length > 0 && !passwordsMatch ? (
          <Text style={styles.error}>{copy('passwordsDoNotMatch')}</Text>
        ) : null}
        <Button
          label={loading ? copy('saving') : copy('saveNewPassword')}
          onPress={handleSubmit}
          disabled={loading || !isPasswordValid || !passwordsMatch}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', marginBottom: 20, marginTop: 12, gap: 12 },
  title: { color: colors.foreground, fontSize: 24, fontWeight: '700' },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  form: { gap: 16 },
  error: { color: colors.destructive, fontSize: 12 },
});
