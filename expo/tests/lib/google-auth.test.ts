import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  getSession: vi.fn(),
  getUser: vi.fn(),
}));
const ensureOAuthUserProfile = vi.hoisted(() => vi.fn());

vi.mock('expo-constants', () => ({
  default: {},
  ExecutionEnvironment: { Bare: 'bare', Standalone: 'standalone' },
}));
vi.mock('expo-linking', () => ({ createURL: vi.fn() }));
vi.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: vi.fn(),
  openAuthSessionAsync: vi.fn(),
}));
vi.mock('@/lib/supabase', () => ({ supabase: { auth } }));
vi.mock('@/lib/oauth-profile', () => ({
  ensureOAuthUserProfile,
  isGoogleAuthUser: vi.fn(),
}));
vi.mock('@/lib/safe-redirect', () => ({
  getSafeRedirectPath: (path: string | null | undefined, fallback: string) => path || fallback,
}));

import { completeOAuthFromCode } from '@/lib/google-auth';

describe('completeOAuthFromCode', () => {
  beforeEach(() => {
    auth.getSession.mockResolvedValue({ data: { session: null } });
    auth.getUser.mockResolvedValue({ data: { user: { id: 'new-google-user' } } });
    auth.exchangeCodeForSession.mockResolvedValue({ error: null });
    ensureOAuthUserProfile.mockResolvedValue(undefined);
  });

  it('shares one PKCE exchange between simultaneous callback handlers', async () => {
    const first = completeOAuthFromCode('one-time-code', '/(tabs)');
    const second = completeOAuthFromCode('one-time-code', '/(tabs)');

    expect(second).toBe(first);
    await expect(Promise.all([first, second])).resolves.toEqual(['/(tabs)', '/(tabs)']);
    expect(auth.exchangeCodeForSession).toHaveBeenCalledTimes(1);
    expect(ensureOAuthUserProfile).toHaveBeenCalledTimes(1);
  });
});
