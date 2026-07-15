import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  APP_VERSION,
  getLegalContactEmail,
  getLegalContactLabel,
  OFFICIAL_SUPPORT_EMAIL,
} from '@/lib/legal-site';

describe('legal-site', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('exposes the current app version', () => {
    expect(APP_VERSION).toBe('2.2.6');
  });

  it('uses the official support email by default', () => {
    expect(getLegalContactEmail()).toBe(OFFICIAL_SUPPORT_EMAIL);
    expect(getLegalContactLabel('it')).toBe(OFFICIAL_SUPPORT_EMAIL);
    expect(getLegalContactLabel('en')).toBe(OFFICIAL_SUPPORT_EMAIL);
  });

  it('allows overriding the support email via env', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPPORT_EMAIL', 'Help@Example.com');

    expect(getLegalContactEmail()).toBe('help@example.com');
  });
});
