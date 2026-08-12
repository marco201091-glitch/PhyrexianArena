import { describe, expect, it, vi } from 'vitest';
import {
  createPasswordRecoveryLink,
  createSignupConfirmationLink,
  createSignupConfirmationLinkForExistingUser,
  findAuthUserByEmail,
} from '@/lib/auth-email-links';
import { buildPasswordResetEmail, buildSignupConfirmationEmail } from '@/lib/auth-email-templates';
import { buildAuthCallbackUrl, buildPasswordResetUrl, getAuthSiteUrl } from '@/lib/auth-site-url';

function adminClient(generateResult: unknown) {
  return {
    auth: { admin: { generateLink: vi.fn().mockResolvedValue(generateResult), listUsers: vi.fn() } },
  };
}

describe('auth emails', () => {
  it('builds localized signup and recovery templates', () => {
    for (const locale of ['it', 'en'] as const) {
      const signup = buildSignupConfirmationEmail(locale, 'https://example.test/signup');
      const recovery = buildPasswordResetEmail(locale, 'https://example.test/reset');
      expect(signup.html).toContain('https://example.test/signup');
      expect(signup.text).toContain('https://example.test/signup');
      expect(recovery.html).toContain('https://example.test/reset');
      expect(recovery.subject).toBeTruthy();
    }
  });

  it('generates all supported auth links with safe redirects', async () => {
    const client = adminClient({ data: { properties: { action_link: 'https://auth.test/action' } }, error: null });
    await expect(createSignupConfirmationLink(client as never, {
      email: 'a@example.test', password: 'Password!123', username: 'alice', siteUrl: 'https://dev.example.test',
    })).resolves.toBe('https://auth.test/action');
    await expect(createSignupConfirmationLinkForExistingUser(client as never, 'a@example.test', 'https://dev.example.test'))
      .resolves.toBe('https://auth.test/action');
    await expect(createPasswordRecoveryLink(client as never, { email: 'a@example.test', siteUrl: 'https://dev.example.test' }))
      .resolves.toBe('https://auth.test/action');
    expect(client.auth.admin.generateLink).toHaveBeenCalledTimes(3);
  });

  it('rejects provider errors and missing links', async () => {
    const providerError = adminClient({ data: {}, error: new Error('provider') });
    await expect(createPasswordRecoveryLink(providerError as never, { email: 'a@example.test', siteUrl: 'https://dev.test' }))
      .rejects.toThrow('provider');
    const missing = adminClient({ data: { properties: {} }, error: null });
    await expect(createSignupConfirmationLinkForExistingUser(missing as never, 'a@example.test', 'https://dev.test'))
      .rejects.toThrow('was not generated');
    await expect(createSignupConfirmationLink(missing as never, {
      email: 'a@example.test', password: 'x', username: 'a', siteUrl: 'https://dev.test',
    })).rejects.toThrow('was not generated');
  });

  it('finds users case-insensitively across pages', async () => {
    const fullPage = Array.from({ length: 200 }, (_, index) => ({ id: String(index), email: `user${index}@test.dev` }));
    const client = adminClient(null);
    client.auth.admin.listUsers
      .mockResolvedValueOnce({ data: { users: fullPage }, error: null })
      .mockResolvedValueOnce({ data: { users: [{ id: 'target', email: 'Target@Test.Dev' }] }, error: null });
    await expect(findAuthUserByEmail(client as never, ' target@test.dev ')).resolves.toMatchObject({ id: 'target' });
    client.auth.admin.listUsers.mockReset().mockResolvedValue({ data: { users: [] }, error: null });
    await expect(findAuthUserByEmail(client as never, 'none@test.dev')).resolves.toBeNull();
    client.auth.admin.listUsers.mockReset().mockResolvedValue({ data: { users: [] }, error: new Error('list failed') });
    await expect(findAuthUserByEmail(client as never, 'none@test.dev')).rejects.toThrow('list failed');
  });

  it('normalizes configured, forwarded and fallback site URLs', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://dev.example.test/';
    expect(getAuthSiteUrl()).toBe('https://dev.example.test');
    delete process.env.NEXT_PUBLIC_SITE_URL;
    const request = new Request('http://internal', { headers: { 'x-forwarded-host': 'proxy.example.test', 'x-forwarded-proto': 'https' } });
    expect(getAuthSiteUrl(request)).toBe('https://proxy.example.test');
    expect(getAuthSiteUrl()).toBe('http://localhost:3000');
    expect(buildAuthCallbackUrl('https://dev.example.test', '/profile')).toContain('next=%2Fprofile');
    expect(buildPasswordResetUrl('https://dev.example.test')).toBe('https://dev.example.test/auth/reset-password');
  });
});
