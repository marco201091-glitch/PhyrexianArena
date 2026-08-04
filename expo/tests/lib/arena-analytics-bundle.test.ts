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
          bracket: '4',
          owner_display_name: 'Alice',
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
    expect(view.commanders[0]).toMatchObject({ commander: 'Atraxa', ownerDisplayName: 'Alice', winRate: 70 });
    expect(view.brackets).toEqual(['4']);
    expect(view.awards.map((award) => award.kind)).toContain('fastest');
  });

  it('builds a three-place podium from aggregate deck data', () => {
    const decks = [60, 45, 30, 15].map((damage, index) => ({
      key: `deck:${index}`,
      deck_id: `deck-${index}`,
      deck_name: `Deck ${index}`,
      commander: `Commander ${index}`,
      commander_image: null,
      bracket: '3',
      owner_display_name: `Owner ${index}`,
      games_played: 3,
      tracked_games: 3,
      wins: 0,
      second_places: 0,
      first_eliminations: 0,
      comeback_wins: 0,
      combo_wins: 0,
      alternate_wins: 0,
      eliminations: 0,
      group_damage_dealt: damage,
      median_winning_duration_seconds: null,
    }));
    const podium = buildArenaAnalyticsView({ totalMatches: 3, decks })
      .awards.filter((award) => award.kind === 'group_slugger');

    expect(podium.map((award) => ({ rank: award.rank, deckId: award.deckId, value: award.value }))).toEqual([
      { rank: 1, deckId: 'deck-0', value: 60 },
      { rank: 2, deckId: 'deck-1', value: 45 },
      { rank: 3, deckId: 'deck-2', value: 30 },
    ]);
  });

  it('keeps identical commanders separate by physical deck and owner', () => {
    const view = buildArenaAnalyticsView({
      decks: [
        { key: 'deck:a', deck_id: 'a', deck_name: 'A', commander: 'Atraxa', commander_image: null, bracket: '4', owner_display_name: 'Alice', games_played: 4, tracked_games: 4, wins: 3, second_places: 0, first_eliminations: 0, comeback_wins: 0, combo_wins: 0, alternate_wins: 0, eliminations: 0, group_damage_dealt: 0, median_winning_duration_seconds: null },
        { key: 'deck:b', deck_id: 'b', deck_name: 'B', commander: 'Atraxa', commander_image: null, bracket: '4', owner_display_name: 'Bob', games_played: 5, tracked_games: 5, wins: 2, second_places: 0, first_eliminations: 0, comeback_wins: 0, combo_wins: 0, alternate_wins: 0, eliminations: 0, group_damage_dealt: 0, median_winning_duration_seconds: null },
      ],
    }, '4', 'gamesPlayed');

    expect(view.commanders.map(({ commander, ownerDisplayName, gamesPlayed }) => [commander, ownerDisplayName, gamesPlayed])).toEqual([
      ['Atraxa', 'Bob', 5], ['Atraxa', 'Alice', 4],
    ]);
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
