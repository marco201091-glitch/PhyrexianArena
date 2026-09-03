import { describe, expect, it } from 'vitest';
import {
  formatArenaSeasonLabel,
  getArenaSeasonArchiveHighlights,
  getArenaSeasonPlayerRecord,
  getArenaSeasonPeriod,
  laterIsoDate,
  parseArenaSeasonContext,
  setArenaSeasonSettings,
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

  it('derives the top ten archive players without mutating the saved rollups', () => {
    const players = Array.from({ length: 12 }, (_, index) => ({
      display_name: String.fromCharCode(65 + index),
      games_played: 20,
      wins: index,
    }));
    const highlights = getArenaSeasonArchiveHighlights({
      id: 'archive', seasonStart: '2025-01-01', seasonEnd: '2026-01-01', resetMonth: 1,
      archivedAt: '2026-01-01T00:00:00Z', summary: { players },
    });
    expect(highlights.topPlayer?.display_name).toBe('L');
    expect(highlights.topPlayers).toHaveLength(10);
    expect(highlights.topPlayers.at(-1)?.display_name).toBe('C');
    expect(players[0].display_name).toBe('A');
  });

  it('formats a stable W/L record from archived player totals', () => {
    expect(getArenaSeasonPlayerRecord({ games_played: 8, wins: 5 })).toEqual({
      gamesPlayed: 8,
      wins: 5,
      losses: 3,
      winRate: 63,
    });
  });

  it('maps disabled seasons to all-time mode and accepts pre-flag payloads', () => {
    expect(parseArenaSeasonContext({ enabled: false, resetMonth: 1, archives: [] })).toBeNull();
    expect(parseArenaSeasonContext({
      resetMonth: 1,
      currentSeasonStart: '2026-01-01',
      currentSeasonEnd: '2027-01-01',
      archives: [],
    })).toMatchObject({ enabled: true, resetMonth: 1 });
  });

  it('updates enabled state and reset month atomically through the manager RPC', async () => {
    const calls: Array<{ name: string; parameters: Record<string, unknown> }> = [];
    const client = {
      rpc: (name: string, parameters: Record<string, unknown>) => {
        calls.push({ name, parameters });
        return Promise.resolve({ data: { enabled: false, resetMonth: 9, archives: [] }, error: null });
      },
    };
    await expect(setArenaSeasonSettings(client, 'arena-id', false, 9)).resolves.toBeNull();
    expect(calls).toEqual([{
      name: 'set_arena_season_settings',
      parameters: { p_group_id: 'arena-id', p_enabled: false, p_reset_month: 9 },
    }]);
  });
});
