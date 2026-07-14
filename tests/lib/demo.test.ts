import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEMO_ACCOUNT_EMAIL,
  DEMO_ACCOUNT_USERNAME,
  isDemoEmail,
  isDemoModeEnabled,
  isDemoUser,
  isPublicDemoModeEnabled,
} from '@/lib/demo';

describe('demo', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('exposes stable demo account identifiers', () => {
    expect(DEMO_ACCOUNT_EMAIL).toBe('demo@phyrexianarena.local');
    expect(DEMO_ACCOUNT_USERNAME).toBe('demo');
  });

  it('reads demo mode flags from env', () => {
    vi.stubEnv('DEMO_MODE_ENABLED', 'true');
    vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', 'true');

    expect(isDemoModeEnabled()).toBe(true);
    expect(isPublicDemoModeEnabled()).toBe(true);
  });

  it('detects demo users and emails', () => {
    expect(isDemoUser({ app_metadata: { is_demo: true } } as never)).toBe(true);
    expect(isDemoUser({ app_metadata: {} } as never)).toBe(false);
    expect(isDemoEmail(' demo@phyrexianarena.local ')).toBe(true);
    expect(isDemoEmail('other@example.com')).toBe(false);
  });
});