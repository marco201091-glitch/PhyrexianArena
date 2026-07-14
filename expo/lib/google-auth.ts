import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase';
import { ensureOAuthUserProfile } from '@/lib/oauth-profile';
import { getSafeRedirectPath } from '@/lib/safe-redirect';

const APP_SCHEME = 'phyrexianarena';

WebBrowser.maybeCompleteAuthSession();

function isStandaloneNativeBuild() {
  return (
    Constants.executionEnvironment === ExecutionEnvironment.Standalone
    || Constants.executionEnvironment === ExecutionEnvironment.Bare
  );
}

function preferLocalhostRedirect(url: string) {
  const ipMatch = url.match(
    /\b(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/,
  );

  if (!ipMatch) {
    return url;
  }

  const [protocol, rest] = url.split(ipMatch[0]);
  return `${protocol}localhost${rest}`;
}

function getMetroDeepLinkOrigin() {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    return preferLocalhostRedirect(`exp://${hostUri}`);
  }

  if (Constants.linkingUri) {
    const origin = Constants.linkingUri.split('/--/')[0]?.split('?')[0];
    if (origin) {
      return preferLocalhostRedirect(origin);
    }
  }

  return 'exp://127.0.0.1:8081';
}

function buildDevOAuthRedirectUrl(safeNext: string) {
  const params = new URLSearchParams({ next: safeNext });
  return `${getMetroDeepLinkOrigin()}/--/callback?${params.toString()}`;
}

export function buildGoogleOAuthRedirectUrl(nextPath?: string | null) {
  const safeNext = getSafeRedirectPath(nextPath, '/(tabs)');

  // Metro / emulator / Expo Go: build exp://127.0.0.1:8081/--/callback manually.
  // (auth) is a route group — URL path is /callback, not /auth/callback.
  // Linking.createURL with scheme "exp" drops the host on dev builds.
  if (__DEV__) {
    return buildDevOAuthRedirectUrl(safeNext);
  }

  if (isStandaloneNativeBuild()) {
    const params = new URLSearchParams({ next: safeNext });
    return `${APP_SCHEME}://callback?${params.toString()}`;
  }

  return Linking.createURL('callback', {
    scheme: APP_SCHEME,
    queryParams: { next: safeNext },
    isTripleSlashed: true,
  });
}

function getQueryParamsFromUrl(input: string) {
  const url = new URL(input, 'https://phony.example');
  const errorCode = url.searchParams.get('errorCode');
  url.searchParams.delete('errorCode');

  const params = Object.fromEntries(url.searchParams.entries()) as Record<string, string>;

  if (url.hash) {
    new URLSearchParams(url.hash.replace(/^#/, '')).forEach((value, key) => {
      params[key] = value;
    });
  }

  return { errorCode, params };
}

function parseOAuthCallbackUrl(url: string) {
  const { params, errorCode } = getQueryParamsFromUrl(url);

  return {
    code: params.code ?? null,
    error: errorCode ?? params.error_description ?? params.error ?? null,
    next: params.next ?? null,
  };
}

function isPkceVerifierMissing(error: { name?: string; code?: string } | null) {
  return error?.name === 'AuthPKCECodeVerifierMissingError'
    || error?.code === 'pkce_code_verifier_not_found';
}

async function finishOAuthSession(nextPath?: string | null) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Invalid session. Try signing in again.');
  }

  await ensureOAuthUserProfile(supabase, user);

  return getSafeRedirectPath(nextPath, '/(tabs)');
}

async function waitForOAuthSession(timeoutMs = 4000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      return session;
    }
    await new Promise((resolve) => {
      setTimeout(resolve, 200);
    });
  }

  return null;
}

export async function completeOAuthFromCode(code: string, nextPath?: string | null) {
  const { data: { session: existingSession } } = await supabase.auth.getSession();
  if (existingSession?.user) {
    return finishOAuthSession(nextPath);
  }

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    if (isPkceVerifierMissing(exchangeError)) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        return finishOAuthSession(nextPath);
      }
    }
    throw exchangeError;
  }

  return finishOAuthSession(nextPath);
}

export async function completeOAuthFromUrl(url: string) {
  const { code, error, next } = parseOAuthCallbackUrl(url);

  if (error) {
    throw new Error(String(error));
  }

  if (!code) {
    throw new Error('Invalid OAuth callback. Try signing in with Google again.');
  }

  return completeOAuthFromCode(code, next);
}

export async function signInWithGoogle(nextPath?: string | null) {
  const redirectTo = buildGoogleOAuthRedirectUrl(nextPath);

  if (__DEV__) {
    console.log('[google-auth] redirectTo:', redirectTo);
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: {
        prompt: 'select_account',
      },
    },
  });

  if (error) {
    throw error;
  }

  if (!data.url) {
    throw new Error('OAuth URL missing');
  }

  const redirectMatcher = redirectTo.split('?')[0];
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectMatcher);

  if (__DEV__) {
    console.log('[google-auth] WebBrowser result:', result.type);
  }

  if (result.type === 'success') {
    return completeOAuthFromUrl(result.url);
  }

  // Android often opens the /callback deep link while WebBrowser returns dismiss.
  const session = await waitForOAuthSession();
  if (session?.user) {
    if (__DEV__) {
      console.log('[google-auth] session ready after WebBrowser', result.type);
    }
    return finishOAuthSession(nextPath);
  }

  if (result.type === 'cancel' || result.type === 'dismiss') {
    throw new Error('cancelled');
  }

  throw new Error('OAuth failed');
}

export { isGoogleAuthUser } from '@/lib/oauth-profile';