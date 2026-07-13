import { supabase } from '@/lib/supabase';
import { clearSupabaseAuthStorage, isInvalidRefreshTokenError } from '@/lib/supabase-auth-recovery';

export async function authenticatedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  let token: string | undefined;

  try {
    const { data, error } = await supabase.auth.getSession();
    if (error && isInvalidRefreshTokenError(error)) {
      clearSupabaseAuthStorage();
    }
    token = data.session?.access_token;
  } catch (error) {
    if (!isInvalidRefreshTokenError(error)) throw error;
    clearSupabaseAuthStorage();
  }

  const headers = new Headers(init.headers);

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(input, {
    ...init,
    headers,
  });
}
