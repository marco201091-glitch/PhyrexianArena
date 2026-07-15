import { describe, expect, it, vi } from 'vitest';
import { isoToMatchDateValue, matchDateToIso, parseMatchDateValue, toMatchDateValue } from '@/lib/match-datetime';

describe('match datetime', () => {
  it('formats and parses local date values at midday to avoid DST rollover', () => {
    expect(toMatchDateValue(new Date(2026, 0, 2, 23, 30))).toBe('2026-01-02');
    const parsed = parseMatchDateValue(' 2026-07-15 ');
    expect(parsed?.getHours()).toBe(12);
    expect(toMatchDateValue(parsed!)).toBe('2026-07-15');
    expect(matchDateToIso('2026-07-15')).toBe(parsed?.toISOString());
  });

  it('rejects malformed and impossible dates', () => {
    expect(parseMatchDateValue('15/07/2026')).toBeNull();
    expect(parseMatchDateValue('2026-02-30')).toBeNull();
    expect(parseMatchDateValue('')).toBeNull();
  });

  it('falls back to today for invalid ISO input', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 15, 12));
    expect(isoToMatchDateValue('invalid')).toBe('2026-07-15');
    expect(isoToMatchDateValue('2026-02-03T10:00:00.000Z')).toMatch(/^2026-02-0[23]$/);
    vi.useRealTimers();
  });
});
