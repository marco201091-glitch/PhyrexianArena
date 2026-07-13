import { Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Loader } from '@/components/ui/loader';
import { Screen } from '@/components/ui/screen';
import { useLanguage } from '@/contexts/language-context';
import { colors } from '@/constants/theme';
import { completeOAuthFromCode, completeOAuthFromUrl } from '@/lib/google-auth';
import * as Linking from 'expo-linking';

export default function AuthCallbackScreen() {
  const { copy } = useLanguage();
  const router = useRouter();
  const params = useLocalSearchParams<{
    next?: string;
    code?: string;
    error?: string;
    error_description?: string;
  }>();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const finish = async () => {
      try {
        const nextValue = Array.isArray(params.next) ? params.next[0] : params.next;

        if (params.error || params.error_description) {
          throw new Error(
            (Array.isArray(params.error_description) ? params.error_description[0] : params.error_description)
            || (Array.isArray(params.error) ? params.error[0] : params.error)
            || copy('googleSignInFailed'),
          );
        }

        const code = Array.isArray(params.code) ? params.code[0] : params.code;
        if (code) {
          const redirectPath = await completeOAuthFromCode(code, nextValue);
          if (!cancelled) {
            router.replace(redirectPath as Href);
          }
          return;
        }

        const initialUrl = await Linking.getInitialURL();
        if (initialUrl?.includes('/callback')) {
          const redirectPath = await completeOAuthFromUrl(initialUrl);
          if (!cancelled) {
            router.replace(redirectPath as Href);
          }
          return;
        }

        throw new Error(copy('googleSignInFailed'));
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : copy('googleSignInFailed');
          if (message === 'cancelled') {
            router.replace('/(auth)/login');
            return;
          }
          if (message.includes('PKCE code verifier not found')) {
            router.replace('/(auth)/login');
            return;
          }
          setErrorMessage(message);
        }
      }
    };

    void finish();

    return () => {
      cancelled = true;
    };
  }, [copy, params.code, params.error, params.error_description, params.next, router]);

  if (errorMessage) {
    return (
      <Screen background="solid">
        <View style={styles.errorWrap}>
          <Text style={styles.errorTitle}>{copy('error')}</Text>
          <Text style={styles.errorBody}>{errorMessage}</Text>
        </View>
      </Screen>
    );
  }

  return <Loader label={copy('signingInWithGoogle')} />;
}

const styles = StyleSheet.create({
  errorWrap: {
    gap: 12,
    paddingTop: 24,
  },
  errorTitle: {
    color: colors.foreground,
    fontSize: 20,
    fontWeight: '700',
  },
  errorBody: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
});