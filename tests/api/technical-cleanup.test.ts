import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
}));

vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdminClient: () => ({ rpc: mocks.rpc }),
}));

import { GET } from '@/app/api/cron/purge-access-logs/route';

function request(token = 'cleanup-secret') {
  return new Request('https://phyrexian-arena.test/api/cron/purge-access-logs', {
    headers: { authorization: `Bearer ${token}` },
  });
}

describe('technical cleanup cron', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = 'cleanup-secret';
    mocks.rpc.mockImplementation((name: string) => Promise.resolve({
      data: name === 'purge_finished_live_games' ? 4 : 2,
      error: null,
    }));
  });

  it('purges logs, throttled telemetry and terminal live games together', async () => {
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledTimes(3);
    expect(mocks.rpc).toHaveBeenCalledWith('purge_finished_live_games', {
      p_retention_days: 14,
    });
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      deleted: {
        accessLogs: 2,
        liveGameTelemetry: 2,
        finishedLiveGames: 4,
      },
    });
  });

  it('rejects requests without the configured cron secret', async () => {
    const response = await GET(request('wrong'));
    expect(response.status).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
