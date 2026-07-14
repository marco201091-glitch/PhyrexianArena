import { supabase } from '@/lib/supabase';
import { getSafeRedirectPath } from '@/lib/safe-redirect';

export function buildGoogleOAuthRedirectUrl(nextPath?: string | null) {
  if (typeof window === 'undefined') {
    return '/auth/callback';
  }

  const callbackUrl = new URL('/auth/callback', window.location.origin);
  callbackUrl.searchParams.set('next', getSafeRedirectPath(nextPath, '/'));
  return callbackUrl.toString();
}

export async function signInWithGoogle(nextPath?: string | null) {
  const redirectTo = buildGoogleOAuthRedirectUrl(nextPath);

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        prompt: 'select_account',
      },
    },
  });

  if (error) {
    throw error;
  }
}

export { isGoogleAuthUser } from '@/lib/oauth-profile';