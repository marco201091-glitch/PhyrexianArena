import { describe, expect, it } from 'vitest';
import { buildArenaAnalyticsBundle } from '@/lib/arena-analytics-bundle';

describe('arena analytics bundle', () => {
  it('builds player, commander, color and deck reports from compact rollups', () => {
    const bundle = buildArenaAnalyticsBundle({
      totalMatches: 4,
      players: [{
        key: 'user:a', user_id: 'a', guest_id: null, display_name: 'Alice',
        is_guest: false, games_played: 4, wins: 2,
      }],
      commanders: [{
        commander: 'Atraxa', commander_image: null, bracket: '4', games_played: 4, wins: 2,
      }],
      colors: [{
        color_identity: ['W', 'U'], bracket: '4', appearances: 4, wins: 2,
      }],
      decks: [{
        key: 'deck:d', deck_id: 'd', is_guest_deck: false, deck_name: 'Counters',
        commander: 'Atraxa', commander_image: null, games_played: 4, tracked_games: 3,
        wins: 2, second_places: 1, total_damage_dealt: 90, total_damage_taken: 70,
        total_life_gained: 20, commander_damage_dealt: 12, infect_dealt: 4,
        eliminations: 3, group_damage_dealt: 30, group_damage_events: 2,
        median_winning_duration_seconds: 1800,
      }],
    }, '4');

    expect(bundle.players[0]).toMatchObject({ gamesPlayed: 4, wins: 2, winRate: 50 });
    expect(bundle.commanders[0]).toMatchObject({ commander: 'Atraxa', winRate: 50 });
    expect(bundle.colors.played.map((row) => [row.color, row.appearances]))
      .toEqual([['W', 4], ['U', 4]]);
    expect(bundle.decks[0]).toMatchObject({
      trackingCoverage: 75,
      averageDamageDealt: 30,
      medianWinningDurationSeconds: 1800,
    });
    expect(bundle.brackets).toEqual(['4']);
  });
});
