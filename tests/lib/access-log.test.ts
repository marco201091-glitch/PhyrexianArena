import { afterEach, describe, expect, it, vi } from 'vitest';

describe('access-log', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('skips anonymous and excluded users', async () => {
    vi.stubEnv('NEXT_PUBLIC_PLATFORM_ADMIN_EMAILS', 'admin@example.com');
    const { shouldSkipAccessLog } = await import('@/lib/access-log');

    expect(shouldSkipAccessLog(null)).toBe(true);
    expect(shouldSkipAccessLog({
      id: '1',
      app_metadata: {},
      user_metadata: { username: 'usertest' },
      aud: 'authenticated',
      created_at: '',
    } as never)).toBe(true);
    expect(shouldSkipAccessLog({
      id: '2',
      email: 'admin@example.com',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: '',
    } as never)).toBe(true);
    expect(shouldSkipAccessLog({
      id: '3',
      email: 'player@example.com',
      app_metadata: {},
      user_metadata: { username: 'marco' },
      aud: 'authenticated',
      created_at: '',
    } as never)).toBe(false);
  });

  it('builds session keys per source', async () => {
    const { getAccessLogSessionKey } = await import('@/lib/access-log');
    expect(getAccessLogSessionKey('user-123', 'web')).toBe('access-log:user-123:web');
    expect(getAccessLogSessionKey('user-123', 'app')).toBe('access-log:user-123:app');
  });

  it('normalizes access sources', async () => {
    const { normalizeAccessLogSource } = await import('@/lib/access-log');
    expect(normalizeAccessLogSource('app')).toBe('app');
    expect(normalizeAccessLogSource(' APP ')).toBe('app');
    expect(normalizeAccessLogSource('web')).toBe('web');
    expect(normalizeAccessLogSource(undefined)).toBe('web');
  });
});