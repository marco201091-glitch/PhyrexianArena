import { describe, expect, it } from 'vitest';
import { deriveUsernameFromEmail, isGoogleAuthUser } from '@/lib/oauth-profile';

describe('oauth-profile', () => {
  it('derives usernames from email local-part with dot underscores', () => {
    expect(deriveUsernameFromEmail('marco.andreani991@gmail.com')).toBe('marco_andreani991');
    expect(deriveUsernameFromEmail('ab@example.com')).toBe('user');
  });

  it('detects Google provider users', () => {
    expect(isGoogleAuthUser({ app_metadata: { provider: 'google' }, identities: [] })).toBe(true);
    expect(isGoogleAuthUser({
      app_metadata: { provider: 'email' },
      identities: [{ provider: 'google' } as never],
    })).toBe(true);
    expect(isGoogleAuthUser(null)).toBe(false);
  });
});