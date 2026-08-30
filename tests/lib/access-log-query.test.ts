import { describe, expect, it, vi } from 'vitest';
import {
  fetchAccessLogsForAdmin,
  normalizeAccessLogLimit,
  normalizeAccessLogPeriod,
  resolveAccessLogDateRange,
} from '@/lib/access-log-query';

describe('access-log-query', () => {
  it('normalizes limits', () => {
    expect(normalizeAccessLogLimit('10')).toBe(10);
    expect(normalizeAccessLogLimit('9999')).toBe(500);
    expect(normalizeAccessLogLimit(null)).toBe(100);
  });

  it('normalizes periods', () => {
    expect(normalizeAccessLogPeriod('24h')).toBe('24h');
    expect(normalizeAccessLogPeriod('bad')).toBe('7d');
  });

  it('resolves preset periods', () => {
    const range = resolveAccessLogDateRange({ period: '24h' });
    expect(range?.from).toBeTruthy();
    expect(range?.to).toBeTruthy();
  });

  it('resolves custom periods', () => {
    const range = resolveAccessLogDateRange({
      period: 'custom',
      from: '2026-07-01',
      to: '2026-07-08',
    });

    expect(range?.from).toBe('2026-07-01T00:00:00.000Z');
    expect(range?.to).toBe('2026-07-08T23:59:59.999Z');
  });

  it('rejects invalid custom ranges', () => {
    expect(resolveAccessLogDateRange({ period: 'custom', from: '2026-07-08', to: '2026-07-01' })).toBeNull();
    expect(resolveAccessLogDateRange({ period: 'custom', from: 'bad', to: '2026-07-01' })).toBeNull();
  });

  it('maps app versions from the administrator RPC and hides them for web logs', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        { id: '1', username: 'app-user', source: 'app', app_version: '8.2.0', accessed_at: '2026-08-29T08:00:00Z' },
        { id: '2', username: 'web-user', source: 'web', app_version: '8.2.0', accessed_at: '2026-08-29T07:00:00Z' },
      ],
      error: null,
    });

    const rows = await fetchAccessLogsForAdmin({ rpc } as never, { period: 'all' });
    expect(rows[0].appVersion).toBe('8.2.0');
    expect(rows[1].appVersion).toBeNull();
  });
});
