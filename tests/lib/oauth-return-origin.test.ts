import { describe, expect, it } from 'vitest';
import {
  DEV_SITE_ORIGIN,
  TEST_SITE_ORIGIN,
} from '@/lib/canonical-host';
import {
  getSafeOAuthReturnOrigin,
  PRODUCTION_SITE_ORIGIN,
} from '@/lib/oauth-return-origin';

describe('oauth-return-origin', () => {
  it('accepts only the self-hosted application origins and localhost', () => {
    for (const origin of [
      PRODUCTION_SITE_ORIGIN,
      TEST_SITE_ORIGIN,
      DEV_SITE_ORIGIN,
      'http://localhost:3000',
    ]) {
      expect(getSafeOAuthReturnOrigin(`${origin}/auth/callback`)).toBe(origin);
    }
  });

  it('rejects external, malformed and legacy hosting origins', () => {
    expect(getSafeOAuthReturnOrigin('https://example.com')).toBeNull();
    expect(getSafeOAuthReturnOrigin('https://untrusted.example')).toBeNull();
    expect(getSafeOAuthReturnOrigin('not-a-url')).toBeNull();
    expect(getSafeOAuthReturnOrigin(null)).toBeNull();
  });
});
