export function isInvalidRefreshTokenError(error: unknown) {
  const message = error instanceof Error
    ? error.message
    : error && typeof error === 'object' && 'message' in error
    ? String((error as { message?: unknown }).message)
    : String(error || '');

  return /invalid refresh token|refresh token not found/i.test(message);
}

function clearLegacyAuthStorage() {
  if (typeof window === 'undefined') return;

  Object.keys(window.localStorage)
    .filter((key) => (
      (key.startsWith('sb-') && key.endsWith('-auth-token')) ||
      key === 'supabase.auth.token'
    ))
    .forEach((key) => window.localStorage.removeItem(key));

  Object.keys(window.sessionStorage)
    .filter((key) => (
      (key.startsWith('sb-') && key.endsWith('-auth-token')) ||
      key === 'supabase.auth.token'
    ))
    .forEach((key) => window.sessionStorage.removeItem(key));
}

function clearSupabaseAuthCookies() {
  if (typeof window === 'undefined') return;

  document.cookie
    .split(';')
    .map((entry) => entry.split('=')[0]?.trim())
    .filter((name): name is string => Boolean(
      name
      && name.startsWith('sb-')
      && !name.includes('-code-verifier'),
    ))
    .forEach((name) => {
      document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
    });
}

export function clearSupabaseAuthStorage() {
  clearLegacyAuthStorage();
  clearSupabaseAuthCookies();
}