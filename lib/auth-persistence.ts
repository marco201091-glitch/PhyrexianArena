import type { CookieOptions } from '@supabase/ssr';

export const REMEMBER_ME_STORAGE_KEY = 'phyrexian-remember-me';

const PERSISTENT_COOKIE_MAX_AGE = 400 * 24 * 60 * 60;

export function getRememberMePreference() {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(REMEMBER_ME_STORAGE_KEY) !== 'false';
}

export function setRememberMePreference(rememberMe: boolean) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(REMEMBER_ME_STORAGE_KEY, rememberMe ? 'true' : 'false');
}

export function getAuthCookieOptions(): CookieOptions {
  const rememberMe = getRememberMePreference();

  return {
    path: '/',
    sameSite: 'lax',
    ...(rememberMe ? { maxAge: PERSISTENT_COOKIE_MAX_AGE } : {}),
  };
}

/** @deprecated Use getAuthCookieOptions with the SSR browser client instead. */
export function getAuthStorage() {
  if (typeof window === 'undefined') return undefined;
  return getRememberMePreference() ? window.localStorage : window.sessionStorage;
}