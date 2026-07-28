import { afterEach, describe, expect, it } from 'vitest';
import { GET } from '@/app/api/auth/turnstile/config/route';

const originalSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

afterEach(() => {
  if (originalSiteKey === undefined) delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  else process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = originalSiteKey;
});

describe('Turnstile runtime configuration', () => {
  it('returns a cache-disabled site key when configured', async () => {
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'test-site-key';
    const response = GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ siteKey: 'test-site-key' });
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('fails closed when the site key is missing', async () => {
    delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    const response = GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'Turnstile is not configured' });
  });
});
