import { describe, expect, it } from 'vitest';
import { getArenaDayKey, groupMatchesByDay } from '@/lib/arena-session';

describe('arena sessions', () => {
  it('assigns matches before the 08:00 UTC boundary to the previous session', () => {
    expect(getArenaDayKey('2026-07-11T07:59:59.999Z')).toBe('2026-07-10');
    expect(getArenaDayKey('2026-07-11T08:00:00.000Z')).toBe('2026-07-11');
  });

  it('supports a custom session boundary', () => {
    expect(getArenaDayKey('2026-07-11T03:00:00.000Z', 4)).toBe('2026-07-10');
    expect(getArenaDayKey('2026-07-11T04:00:00.000Z', 4)).toBe('2026-07-11');
  });

  it('groups newest days first while preserving match order and custom labels', () => {
    const groups = groupMatchesByDay([
      { id: 'new', played_at: '2026-07-11T12:00:00.000Z' },
      { id: 'old-a', played_at: '2026-07-10T12:00:00.000Z' },
      { id: 'old-b', played_at: '2026-07-10T18:00:00.000Z' },
    ], { formatLabel: (key) => `day:${key}` });

    expect(groups.map((group) => group.dayKey)).toEqual(['2026-07-11', '2026-07-10']);
    expect(groups[1]).toMatchObject({ label: 'day:2026-07-10', matchCount: 2 });
    expect(groups[1]?.matches.map((match) => match.id)).toEqual(['old-a', 'old-b']);
  });
});
