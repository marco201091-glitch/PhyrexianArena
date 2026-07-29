import { describe, expect, it, vi } from 'vitest';
import {
  buildArenaAnalyticsView,
  fetchArenaAnalytics,
  getAnalyticsSince,
} from '@/lib/arena-analytics-bundle';

describe('arena analytics bundle', () => {
  it('builds complete report views without loading match history', () => {
    const view = buildArenaAnalyticsView({
      totalMatches: 1200,
      players: [
        { key: 'user:a', user_id: 'a', display_name: 'Alice', is_guest: false, games_played: 10, wins: 7 },
        { key: 'user:b', user_id: 'b', display_name: 'Bob', is_guest: false, games_played: 10, wins: 3 },
      ],
      commanders: [
        { commander: 'Atraxa', commander_image: 'https://img.test/a.jpg', bracket: '4', games_played: 10, wins: 7 },
      ],
      colors: [
        { color_identity: ['W', 'U', 'B', 'G'], bracket: '4', appearances: 10, wins: 7 },
      ],
      decks: [
        {
          key: 'deck:a',
          deck_id: 'a',
          deck_name: 'Counters',
          commander: 'Atraxa',
          commander_image: 'https://img.test/a.jpg',
          games_played: 10,
          tracked_games: 10,
          wins: 7,
          second_places: 2,
          first_eliminations: 1,
          comeback_wins: 2,
          combo_wins: 1,
          alternate_wins: 0,
          eliminations: 8,
          group_damage_dealt: 60,
          median_winning_duration_seconds: 2400,
        },
      ],
    });

    expect(view.totalMatches).toBe(1200);
    expect(view.players[0]).toMatchObject({ displayName: 'Alice', winRate: 70 });
    expect(view.commanders[0]).toMatchObject({ commander: 'Atraxa', winRate: 70 });
    expect(view.brackets).toEqual(['4']);
    expect(view.awards.map((award) => award.kind)).toContain('fastest');
  });

  it('sends a nullable all-time boundary to the aggregate RPC', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { totalMatches: 7 }, error: null });
    await expect(fetchArenaAnalytics({ rpc } as never, 'group-1', 'all'))
      .resolves.toEqual({ totalMatches: 7 });
    expect(rpc).toHaveBeenCalledWith('get_arena_analytics_bundle', {
      p_group_id: 'group-1',
      p_since: null,
      p_until: null,
    });
    expect(new Date(getAnalyticsSince('30d')!).getHours()).toBe(0);
  });
});
