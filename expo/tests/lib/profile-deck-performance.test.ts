import { describe, expect, it, vi } from 'vitest';
import {
  buildProfileDeckPerformanceMaps,
  fetchProfileDeckPerformance,
} from '@/lib/profile-deck-performance';

describe('profile deck performance', () => {
  it('maps all-time V6/V7 facts into mastery-compatible performance', () => {
    const result = buildProfileDeckPerformanceMaps([{
      deck_id: 'deck-1',
      games_played: 12,
      wins: 4,
      mastery_points: 20,
      tracked_games: 9,
      second_places: 2,
      damage_dealt: '240',
      damage_taken: 180,
      life_gained: 30,
      commander_damage: 42,
      infect_dealt: 3,
      eliminations: 7,
      median_winning_duration_seconds: 2700,
    }]);

    expect(result.winRates['deck-1']).toEqual({ gamesPlayed: 12, wins: 4, winRate: 33 });
    expect(result.performance['deck-1']).toMatchObject({
      trackedGames: 9,
      trackingCoverage: 75,
      damageDealt: 240,
    });
  });

  it('uses one bounded RPC and falls back cleanly on V6', async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'missing function' } });
    await expect(fetchProfileDeckPerformance({ rpc } as never, 'user-1'))
      .resolves.toEqual({ winRates: {}, performance: {} });
    await expect(fetchProfileDeckPerformance({ rpc } as never, 'user-1'))
      .resolves.toBeNull();
  });
});
