import { describe, expect, it } from 'vitest';
import { computeArenaColorAnalytics, type ArenaColorParticipant } from '@/lib/arena-color-analytics';

function player(
  id: string,
  colors: string[] | null,
  winner = false,
  bracket = '3',
): ArenaColorParticipant {
  return {
    deck_id: id, is_winner: winner,
    decks: { bracket, commander: `Commander ${id}`, color_identity: colors },
  };
}

describe('arena color analytics', () => {
  it('counts appearances, wins, win rates, and guild pairs', () => {
    const matches = [
      { match_participants: [player('a', ['W', 'U'], true), player('b', ['R'])] },
      { match_participants: [player('a', ['W', 'U']), player('b', ['R'], true)] },
      { match_participants: [player('a', ['W', 'U'], true), player('c', ['G'])] },
    ];
    const analytics = computeArenaColorAnalytics(matches, new Map(), 'all');

    expect(analytics.played.find((entry) => entry.color === 'W')).toMatchObject({ appearances: 3, wins: 2, winRate: 67 });
    expect(analytics.won.map((entry) => entry.color)).toEqual(['W', 'U', 'R']);
    expect(analytics.winRates.map((entry) => entry.color)).toEqual(['W', 'U']);
    expect(analytics.pairs[0]).toMatchObject({ key: 'identity:guild:U-W', appearances: 3, wins: 2, winRate: 67 });
    expect(analytics.totalGamesWithColors).toBe(3);
  });

  it('prefers deck overrides and applies bracket filters', () => {
    const matches = [{ match_participants: [player('override', ['R'], true, '2'), player('other', ['G'], false, '3')] }];
    const analytics = computeArenaColorAnalytics(matches, new Map([['override', ['B', 'R']]]), '2');
    expect(analytics.played.map((entry) => entry.color)).toEqual(['B', 'R']);
    expect(analytics.pairs[0]?.key).toBe('identity:guild:B-R');
  });

  it('tracks games whose selected decks have commanders but no color data', () => {
    const missing = player('missing', null);
    const analytics = computeArenaColorAnalytics([
      { match_participants: [missing] },
      { match_participants: [{ ...missing, deck_id: null }] },
    ], new Map(), 'all');
    expect(analytics.missingColorGames).toBe(1);
    expect(analytics.totalGamesWithColors).toBe(1);
    expect(analytics.played).toEqual([]);
  });
});
