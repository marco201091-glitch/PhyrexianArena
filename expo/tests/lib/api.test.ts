import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSession = vi.hoisted(() => vi.fn());

vi.mock('@/lib/env', () => ({ getApiBaseUrl: () => 'https://api.example' }));
vi.mock('@/lib/supabase', () => ({ supabase: { auth: { getSession } } }));

import { apiGet, apiPost } from '@/lib/api';

describe('API client', () => {
  beforeEach(() => {
    getSession.mockResolvedValue({ data: { session: null } });
  });

  it('adds the current bearer token to GET requests', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'token-1' } } });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(
      JSON.stringify({ groups: [1] }), { status: 200, headers: { 'Content-Type': 'application/json' } },
    ));
    const result = await apiGet<{ groups: number[] }>('/groups');
    expect(fetchMock).toHaveBeenCalledWith('https://api.example/groups', {
      headers: { Authorization: 'Bearer token-1' },
    });
    expect(result).toEqual({ data: { groups: [1] }, error: undefined, status: 200 });
  });

  it('serializes POST bodies and exposes API errors', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(
      JSON.stringify({ error: 'Denied' }), { status: 403, headers: { 'Content-Type': 'application/json' } },
    ));
    const result = await apiPost('/join', { code: 'ABC' });
    expect(fetchMock).toHaveBeenCalledWith('https://api.example/join', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: 'ABC' }),
    });
    expect(result).toEqual({ data: { error: 'Denied' }, error: 'Denied', status: 403 });
  });

  it('survives successful responses without JSON bodies', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));
    expect(await apiGet('/empty')).toEqual({ data: {}, error: undefined, status: 204 });
  });
});
