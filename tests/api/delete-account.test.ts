import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireAuthenticatedUser: vi.fn(),
  applyUserRateLimit: vi.fn(),
  signInWithPassword: vi.fn(),
  listAvatars: vi.fn(),
  removeAvatars: vi.fn(),
  signOut: vi.fn(),
  deleteUser: vi.fn(),
  deleteRateLimitRows: vi.fn(),
}));

vi.mock('@/app/api/_lib/auth', () => ({
  requireAuthenticatedUser: mocks.requireAuthenticatedUser,
}));

vi.mock('@/app/api/_lib/with-rate-limit', () => ({
  applyUserRateLimit: mocks.applyUserRateLimit,
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { signInWithPassword: mocks.signInWithPassword },
  }),
}));

vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdminClient: () => ({
    from: () => ({
      delete: () => ({ like: mocks.deleteRateLimitRows }),
    }),
    storage: {
      from: () => ({
        list: mocks.listAvatars,
        remove: mocks.removeAvatars,
      }),
    },
    auth: {
      admin: {
        signOut: mocks.signOut,
        deleteUser: mocks.deleteUser,
      },
    },
  }),
}));

import { POST } from '@/app/api/auth/delete-account/route';

function deletionRequest(password = 'ValidPassword1') {
  return new Request('https://app.phyrexianarena.dpdns.org/api/auth/delete-account', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer active-token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ password }),
  });
}

describe('account deletion API', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'publishable-key';
    process.env.PLATFORM_ADMIN_EMAILS = '';

    mocks.requireAuthenticatedUser.mockResolvedValue({
      id: 'user-1',
      email: 'player@example.com',
      app_metadata: { provider: 'email', providers: ['email'] },
    });
    mocks.applyUserRateLimit.mockResolvedValue(null);
    mocks.signInWithPassword.mockResolvedValue({ error: null });
    mocks.listAvatars.mockResolvedValue({ data: [{ name: 'avatar' }], error: null });
    mocks.removeAvatars.mockResolvedValue({ error: null });
    mocks.signOut.mockResolvedValue({ error: null });
    mocks.deleteUser.mockResolvedValue({ error: null });
    mocks.deleteRateLimitRows.mockResolvedValue({ error: null });
  });

  it('reauthenticates, removes avatar data, revokes sessions and deletes the user', async () => {
    const response = await POST(deletionRequest());

    expect(response.status).toBe(200);
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: 'player@example.com',
      password: 'ValidPassword1',
    });
    expect(mocks.removeAvatars).toHaveBeenCalledWith(['user-1/avatar']);
    expect(mocks.deleteRateLimitRows).toHaveBeenCalledWith('bucket_key', '%:user:user-1');
    expect(mocks.signOut).toHaveBeenCalledWith('active-token', 'global');
    expect(mocks.deleteUser).toHaveBeenCalledWith('user-1');
    expect(mocks.signOut.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.deleteUser.mock.invocationCallOrder[0],
    );
  });

  it('does not delete the account when password verification fails', async () => {
    mocks.signInWithPassword.mockResolvedValue({ error: new Error('invalid credentials') });

    const response = await POST(deletionRequest('wrong'));

    expect(response.status).toBe(403);
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });

  it('protects the demo account', async () => {
    mocks.requireAuthenticatedUser.mockResolvedValue({
      id: 'demo-user',
      email: 'demo@phyrexianarena.local',
      app_metadata: { provider: 'email' },
    });

    const response = await POST(deletionRequest());

    expect(response.status).toBe(403);
    expect(mocks.signInWithPassword).not.toHaveBeenCalled();
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });
});
