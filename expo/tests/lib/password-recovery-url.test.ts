import { describe, expect, it } from 'vitest';
import { parsePasswordRecoveryUrl } from '@/lib/password-recovery-url';

describe('parsePasswordRecoveryUrl', () => {
  it('reads PKCE codes from native deep links', () => {
    expect(parsePasswordRecoveryUrl('phyrexianarena://reset-password?code=pkce-code')).toEqual({
      code: 'pkce-code',
      accessToken: null,
      refreshToken: null,
    });
  });

  it('reads complete token pairs from the query string', () => {
    expect(parsePasswordRecoveryUrl(
      'phyrexianarena://reset-password?access_token=access&refresh_token=refresh',
    )).toEqual({ code: null, accessToken: 'access', refreshToken: 'refresh' });
  });

  it('reads implicit-flow token pairs from the URL fragment', () => {
    expect(parsePasswordRecoveryUrl(
      'phyrexianarena://reset-password#access_token=hash-access&refresh_token=hash-refresh&type=recovery',
    )).toEqual({ code: null, accessToken: 'hash-access', refreshToken: 'hash-refresh' });
  });

  it('does not accept an incomplete token pair', () => {
    expect(parsePasswordRecoveryUrl(
      'phyrexianarena://reset-password?access_token=orphaned',
    )).toEqual({ code: null, accessToken: null, refreshToken: null });
  });

  it('fails safely for empty and malformed URLs', () => {
    const empty = { code: null, accessToken: null, refreshToken: null };
    expect(parsePasswordRecoveryUrl('')).toEqual(empty);
    expect(parsePasswordRecoveryUrl('not a url')).toEqual(empty);
  });
});
