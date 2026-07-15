import { beforeEach, describe, expect, it, vi } from 'vitest';

const values = vi.hoisted(() => new Map<string, string>());
const secureGet = vi.hoisted(() => vi.fn());
const secureSet = vi.hoisted(() => vi.fn());

vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
vi.mock('expo-secure-store', () => ({ getItemAsync: secureGet, setItemAsync: secureSet }));
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => values.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => { values.set(key, value); }),
    removeItem: vi.fn(async (key: string) => { values.delete(key); }),
  },
}));

import { authStorage, getRememberMePreference, REMEMBER_ME_STORAGE_KEY, setRememberMePreference } from '@/lib/auth-persistence';

describe('auth persistence', () => {
  beforeEach(() => values.clear());

  it('persists ordinary sessions when remember-me is enabled', async () => {
    await setRememberMePreference(true);
    await authStorage.setItem('supabase-session', 'session-value');
    expect(secureSet).toHaveBeenCalledWith(REMEMBER_ME_STORAGE_KEY, 'true');
    expect(await authStorage.getItem('supabase-session')).toBe('session-value');
    await authStorage.removeItem('supabase-session');
    expect(await authStorage.getItem('supabase-session')).toBeNull();
    expect(await getRememberMePreference()).toBe(true);
  });

  it('keeps non-remembered sessions only in memory but persists PKCE recovery', async () => {
    await setRememberMePreference(false);
    await authStorage.setItem('supabase-session', 'memory-only');
    expect(values.has('supabase-session')).toBe(false);
    expect(await authStorage.getItem('supabase-session')).toBe('memory-only');

    await authStorage.setItem('flow-code-verifier', 'pkce-value');
    expect(values.get('flow-code-verifier')).toBe('pkce-value');
    await authStorage.removeItem('flow-code-verifier');
    expect(values.has('flow-code-verifier')).toBe(false);
  });

  it('clears an in-memory session when remember-me is disabled', async () => {
    await setRememberMePreference(false);
    await authStorage.setItem('temporary', 'secret');
    expect(await authStorage.getItem('temporary')).toBe('secret');
    await setRememberMePreference(false);
    expect(await authStorage.getItem('temporary')).toBeNull();
  });
});
