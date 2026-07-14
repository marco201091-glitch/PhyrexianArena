import { describe, expect, it } from 'vitest';
import {
  isoToMatchDateValue,
  matchDateToIso,
  parseMatchDateValue,
  toMatchDateValue,
} from '@/lib/match-datetime';

describe('match-datetime', () => {
  it('formats local dates for date inputs', () => {
    expect(toMatchDateValue(new Date(2026, 6, 8, 14, 5))).toBe('2026-07-08');
  });

  it('round-trips through ISO', () => {
    const iso = '2026-03-15T10:30:00.000Z';
    const local = isoToMatchDateValue(iso);
    const parsed = matchDateToIso(local);

    expect(local).toBe('2026-03-15');
    expect(parsed).toBe(new Date('2026-03-15T12:00:00').toISOString());
  });

  it('rejects invalid values', () => {
    expect(parseMatchDateValue('')).toBeNull();
    expect(parseMatchDateValue('2026-13-40')).toBeNull();
    expect(parseMatchDateValue('2026-07-08T14:00')).toBeNull();
    expect(matchDateToIso('')).toBeNull();
  });

  it('falls back to today for invalid ISO input', () => {
    const fallback = isoToMatchDateValue('invalid');
    expect(fallback).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});