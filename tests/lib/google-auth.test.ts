import { describe, expect, it } from 'vitest';
import { isGoogleAuthUser } from '@/lib/google-auth';

describe('google-auth', () => {
  it('re-exports Google auth detection', () => {
    expect(isGoogleAuthUser({ app_metadata: { provider: 'google' } })).toBe(true);
  });
});