import { describe, expect, it } from 'vitest';
import {
  formatArenaSeasonLabel,
  getArenaSeasonArchiveHighlights,
  getArenaSeasonPeriod,
  laterIsoDate,
} from '@/lib/arena-seasons';

describe('arena seasons', () => {
  it('keeps the most recent lower bound', () => {
    expect(laterIsoDate('2026-01-01T00:00:00.000Z', '2026-08-01T00:00:00.000Z'))
      .toBe('2026-08-01T00:00:00.000Z');
    expect(laterIsoDate(null, '2026-01-01T00:00:00.000Z'))
      .toBe('2026-01-01T00:00:00.000Z');
  });

  it('labels January and cross-year seasons clearly', () => {
    expect(formatArenaSeasonLabel('2026-01-01', '2027-01-01', 'it-IT')).toBe('Stagione 2026');
    expect(formatArenaSeasonLabel('2026-09-01', '2027-09-01', 'en-US')).toBe('Season 2026/27');
  });

  it('computes UTC season boundaries on both sides of the reset month', () => {
    expect(getArenaSeasonPeriod(9, new Date('2026-08-31T23:59:59Z'))).toEqual({
      start: '2025-09-01',
      end: '2026-09-01',
    });
    expect(getArenaSeasonPeriod(9, new Date('2026-09-01T00:00:00Z'))).toEqual({
      start: '2026-09-01',
      end: '2027-09-01',
    });
  });

  it('derives archive leaders without mutating the saved rollups', () => {
    const players = [
      { display_name: 'A', games_played: 10, wins: 5 },
      { display_name: 'B', games_played: 4, wins: 3 },
    ];
    const highlights = getArenaSeasonArchiveHighlights({
      id: 'archive', seasonStart: '2025-01-01', seasonEnd: '2026-01-01', resetMonth: 1,
      archivedAt: '2026-01-01T00:00:00Z', summary: { players },
    });
    expect(highlights.topPlayer?.display_name).toBe('B');
    expect(players[0].display_name).toBe('A');
  });
});
