import { describe, expect, it } from 'vitest';
import {
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
});