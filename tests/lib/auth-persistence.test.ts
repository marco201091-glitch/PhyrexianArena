import { describe, expect, it } from 'vitest';
import {
  getAuthCookieOptions,
  getRememberMePreferenceFromCookies,
  parseRememberMePreferenceCookie,
  REMEMBER_ME_STORAGE_KEY,
} from '@/lib/auth-persistence';

describe('auth-persistence', () => {
  it('defaults remember-me to enabled when preference cookie is absent', () => {
    expect(getRememberMePreferenceFromCookies([])).toBe(true);
    expect(parseRememberMePreferenceCookie('')).toBe(true);
  });

  it('reads remember-me preference from request cookies', () => {
    expect(
      getRememberMePreferenceFromCookies([
        { name: REMEMBER_ME_STORAGE_KEY, value: 'false' },
      ]),
    ).toBe(false);
    expect(
      parseRememberMePreferenceCookie(`${REMEMBER_ME_STORAGE_KEY}=false`),
    ).toBe(false);
  });

  it('applies persistent maxAge only when remember-me is enabled', () => {
    const persistent = getAuthCookieOptions([
      { name: REMEMBER_ME_STORAGE_KEY, value: 'true' },
    ]);
    const sessionOnly = getAuthCookieOptions([
      { name: REMEMBER_ME_STORAGE_KEY, value: 'false' },
    ]);

    expect(persistent.maxAge).toBe(400 * 24 * 60 * 60);
    expect(sessionOnly.maxAge).toBeUndefined();
  });
});