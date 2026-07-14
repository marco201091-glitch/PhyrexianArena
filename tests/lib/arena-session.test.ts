import { describe, expect, it } from 'vitest';
import { getArenaDayKey, groupMatchesByDay } from '@/lib/arena-session';

describe('arena-session', () => {
  it('assigns late-night matches to the previous day before 08:00 UTC', () => {
    const key = getArenaDayKey('2026-07-11T01:30:00.000Z');
    expect(key).toBe('2026-07-10');
  });

  it('keeps evening matches on the same calendar day from 08:00 UTC onward', () => {
    const key = getArenaDayKey('2026-07-10T21:00:00.000Z');
    expect(key).toBe('2026-07-10');
  });

  it('groups matches by day with newest day first and preserves match order', () => {
    const groups = groupMatchesByDay([
      { id: '3', played_at: '2026-07-11T12:00:00.000Z' },
      { id: '2', played_at: '2026-07-10T12:00:00.000Z' },
      { id: '1', played_at: '2026-07-10T12:00:00.000Z' },
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0].dayKey).toBe('2026-07-11');
    expect(groups[0].matches.map((match) => match.id)).toEqual(['3']);
    expect(groups[1].dayKey).toBe('2026-07-10');
    expect(groups[1].matchCount).toBe(2);
    expect(groups[1].matches.map((match) => match.id)).toEqual(['2', '1']);
  });
});