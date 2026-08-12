import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSupabaseAdminClient: vi.fn(),
}));

vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdminClient: mocks.getSupabaseAdminClient,
}));

import { GET } from '@/app/api/ready/route';

function databaseClient(error: unknown = null) {
  const abortSignal = vi.fn().mockResolvedValue({ error });
  const limit = vi.fn(() => ({ abortSignal }));
  const select = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ select }));
  return { client: { from }, from, select, limit, abortSignal };
}

describe('GET /api/ready', () => {
  beforeEach(() => {
    delete process.env.GIT_COMMIT_SHA;
  });

  it('returns readiness metadata when the database responds', async () => {
    const query = databaseClient();
    mocks.getSupabaseAdminClient.mockReturnValue(query.client);
    process.env.GIT_COMMIT_SHA = 'abc123';

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(body).toMatchObject({
      ok: true,
      status: 'ready',
      version: '8.0.3',
      commit: 'abc123',
      checks: { database: { ok: true, status: 'ready' } },
    });
    expect(query.from).toHaveBeenCalledWith('profiles');
  });

  it('returns 503 without exposing internals when the database is unavailable', async () => {
    const query = databaseClient(new Error('secret connection details'));
    mocks.getSupabaseAdminClient.mockReturnValue(query.client);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.checks.database).toMatchObject({ ok: false, status: 'unavailable' });
    expect(JSON.stringify(body)).not.toContain('secret connection details');
  });

  it('reports missing server configuration as degraded', async () => {
    mocks.getSupabaseAdminClient.mockReturnValue(null);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.checks.database.status).toBe('not_configured');
  });
});
