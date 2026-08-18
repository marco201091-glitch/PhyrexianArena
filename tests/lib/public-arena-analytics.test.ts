import { describe, expect, it } from 'vitest';
import { buildPublicArenaAnalytics } from '@/lib/public-arena-analytics';

describe('public Arena analytics', () => {
  it('builds bounded rankings from a database aggregate payload', () => {
    const result = buildPublicArenaAnalytics({
      totalMatches: 12,
      players: [
        { key: 'user:1', user_id: '1', guest_id: null, display_name: 'A', is_guest: false, games_played: 5, wins: 4 },
        { key: 'user:2', user_id: '2', guest_id: null, display_name: 'B', is_guest: false, games_played: 7, wins: 2 },
      ],
      decks: [{
        key: 'deck:1',
        deck_id: '1',
        is_guest_deck: false,
        deck_name: 'Atraxa counters',
        commander: 'Atraxa',
        commander_image: null,
        bracket: '3',
        owner_display_name: 'A',
        games_played: 5,
        tracked_games: 0,
        wins: 4,
        second_places: 0,
        total_damage_dealt: 0,
        total_damage_taken: 0,
        total_life_gained: 0,
        commander_damage_dealt: 0,
        infect_dealt: 0,
        eliminations: 0,
        group_damage_dealt: 0,
        group_damage_events: 0,
        median_winning_duration_seconds: null,
      }],
      colors: [{ color_identity: ['W', 'U'], bracket: '3', appearances: 5, wins: 4 }],
    });

    expect(result.summary).toEqual({ totalMatches: 12, totalPlayers: 2 });
    expect(result.topPlayers[0]).toMatchObject({ displayName: 'A', winRate: 80 });
    expect(result.topDecks[0]).toMatchObject({ name: 'Atraxa counters', winRate: 80 });
    expect(result.topColors).toHaveLength(2);
  });
});
