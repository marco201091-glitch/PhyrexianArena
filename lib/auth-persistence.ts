import { parse, serialize } from 'cookie';
import type { CookieOptions } from '@supabase/ssr';

export const REMEMBER_ME_STORAGE_KEY = 'phyrexian-remember-me';

const PERSISTENT_COOKIE_MAX_AGE = 400 * 24 * 60 * 60;

type RequestCookie = { name: string; value: string };

function readRememberMeValue(value: string | null | undefined) {
  return value !== 'false';
}

export function getRememberMePreferenceFromCookies(cookies: RequestCookie[]) {
  const entry = cookies.find((cookie) => cookie.name === REMEMBER_ME_STORAGE_KEY);
  if (!entry) return true;
  return readRememberMeValue(entry.value);
}

export function getRememberMePreference(cookies?: RequestCookie[]) {
  if (cookies) {
    return getRememberMePreferenceFromCookies(cookies);
  }

  if (typeof window === 'undefined') return true;
  return readRememberMeValue(window.localStorage.getItem(REMEMBER_ME_STORAGE_KEY));
}

function writeRememberMeCookie(rememberMe: boolean) {
  if (typeof document === 'undefined') return;

  document.cookie = serialize(REMEMBER_ME_STORAGE_KEY, rememberMe ? 'true' : 'false', {
    path: '/',
    sameSite: 'lax',
    ...(rememberMe ? { maxAge: PERSISTENT_COOKIE_MAX_AGE } : {}),
  });
}

export function setRememberMePreference(rememberMe: boolean) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(REMEMBER_ME_STORAGE_KEY, rememberMe ? 'true' : 'false');
  writeRememberMeCookie(rememberMe);
}

export function syncRememberMePreferenceCookie() {
  if (typeof window === 'undefined') return;
  const rememberMe = readRememberMeValue(window.localStorage.getItem(REMEMBER_ME_STORAGE_KEY));
  writeRememberMeCookie(rememberMe);
}

export function getAuthCookieOptions(cookies?: RequestCookie[]): CookieOptions {
  const rememberMe = getRememberMePreference(cookies);

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

export function parseRememberMePreferenceCookie(cookieHeader: string | null | undefined) {
  if (!cookieHeader) return true;
  const parsed = parse(cookieHeader);
  return readRememberMeValue(parsed[REMEMBER_ME_STORAGE_KEY]);
}