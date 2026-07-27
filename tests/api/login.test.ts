import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  applyIpRateLimit: vi.fn(),
  resolveLoginEmail: vi.fn(),
  signInWithPassword: vi.fn(),
}));

vi.mock('@/app/api/_lib/with-rate-limit', () => ({
  applyIpRateLimit: mocks.applyIpRateLimit,
}));

vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdminClient: () => ({ rpc: mocks.resolveLoginEmail }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { signInWithPassword: mocks.signInWithPassword },
  }),
}));

import { POST } from '@/app/api/auth/login/route';

function loginRequest(identifier: string, password = 'ValidPassword1') {
  return new Request('https://app.phyrexianarena.dpdns.org/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });
}

describe('password login API', () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = 'https://project.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'publishable-key';
    mocks.applyIpRateLimit.mockResolvedValue(null);
    mocks.resolveLoginEmail.mockResolvedValue({
      data: 'player@example.com',
      error: null,
    });
    mocks.signInWithPassword.mockResolvedValue({
      data: {
        session: {
          access_token: 'access-token',
          refresh_token: 'refresh-token',
        },
      },
      error: null,
    });
  });

  it('resolves usernames and returns only verified session tokens', async () => {
    const response = await POST(loginRequest('usertest'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.resolveLoginEmail).toHaveBeenCalledWith(
      'resolve_login_email',
      { identifier: 'usertest' },
    );
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: 'player@example.com',
      password: 'ValidPassword1',
    });
    expect(body).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
    expect(JSON.stringify(body)).not.toContain('player@example.com');
  });

  it('returns the same opaque error for unknown usernames and wrong passwords', async () => {
    mocks.resolveLoginEmail.mockResolvedValueOnce({ data: null, error: null });
    const unknownResponse = await POST(loginRequest('unknown'));

    mocks.signInWithPassword.mockResolvedValueOnce({
      data: { session: null },
      error: new Error('invalid credentials'),
    });
    const wrongPasswordResponse = await POST(loginRequest('player@example.com', 'wrong'));

    expect(unknownResponse.status).toBe(401);
    expect(wrongPasswordResponse.status).toBe(401);
    expect(await unknownResponse.json()).toEqual({ error: 'Invalid credentials.' });
    expect(await wrongPasswordResponse.json()).toEqual({ error: 'Invalid credentials.' });
  });

  it('honors the IP rate-limit response before touching auth', async () => {
    mocks.applyIpRateLimit.mockResolvedValueOnce(
      new Response('rate limited', { status: 429 }),
    );

    const response = await POST(loginRequest('usertest'));

    expect(response.status).toBe(429);
    expect(mocks.resolveLoginEmail).not.toHaveBeenCalled();
    expect(mocks.signInWithPassword).not.toHaveBeenCalled();
  });
});
