import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  applyIpRateLimit: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock('@/app/api/_lib/with-rate-limit', () => ({
  applyIpRateLimit: mocks.applyIpRateLimit,
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
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    mocks.applyIpRateLimit.mockResolvedValue(null);
    vi.stubGlobal('fetch', mocks.fetch);
    mocks.fetch.mockImplementation(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/rest/v1/rpc/resolve_login_email')) {
        return Response.json('player@example.com');
      }
      const payload = JSON.parse(String(init?.body ?? '{}')) as { password?: string };
      return payload.password === 'wrong'
        ? Response.json({ error: 'invalid credentials' }, { status: 400 })
        : Response.json({
            access_token: 'access-token',
            refresh_token: 'refresh-token',
          });
    });
  });

  it('resolves usernames and returns only verified session tokens', async () => {
    const response = await POST(loginRequest('usertest'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
    expect(String(mocks.fetch.mock.calls[0][0])).toContain('/rest/v1/rpc/resolve_login_email');
    expect(String(mocks.fetch.mock.calls[1][0])).toContain('/auth/v1/token?grant_type=password');
    expect(JSON.parse(String(mocks.fetch.mock.calls[1][1]?.body))).toEqual({
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
    mocks.fetch.mockResolvedValueOnce(Response.json(null));
    const unknownResponse = await POST(loginRequest('unknown'));

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
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});
