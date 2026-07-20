import { describe, expect, it } from 'vitest';
import {
  buildPersonalAnalytics,
  calculateWinStreaks,
  emptyPersonalAnalytics,
  PERSONAL_BEST_DECK_MIN_GAMES,
  resolveDeckColorsForAnalytics,
  type PersonalDeckSnapshot,
} from '@/lib/personal-analytics';

const decks = new Map<string, PersonalDeckSnapshot>([
  ['a', { id: 'a', name: 'Atraxa', commander: 'Atraxa', commander_image: null, color_identity: ['W', 'U', 'B', 'G'], bracket: '3', source_type: 'manual', source_url: null }],
  ['b', { id: 'b', name: 'Krenko', commander: 'Krenko', commander_image: null, color_identity: ['R'], bracket: '2', source_type: 'manual', source_url: null }],
]);

describe('personal analytics', () => {
  it('returns a complete empty model', () => {
    expect(buildPersonalAnalytics([], decks)).toEqual(emptyPersonalAnalytics());
  });

  it('aggregates decks, colors, brackets, wins, and chronological streaks', () => {
    const analytics = buildPersonalAnalytics([
      { deck_id: 'a', is_winner: true, played_at: '2026-01-01T10:00:00Z' },
      { deck_id: 'a', is_winner: false, played_at: '2026-01-02T10:00:00Z' },
      { deck_id: 'b', is_winner: true, played_at: '2026-01-03T10:00:00Z' },
      { deck_id: 'b', is_winner: true, played_at: '2026-01-04T10:00:00Z' },
    ], decks);

    expect(analytics).toMatchObject({ gamesPlayed: 4, wins: 3, uniqueDecks: 2, longestWinStreak: 2, currentWinStreak: 2 });
    expect(analytics.topDecks.map((deck) => [deck.id, deck.gamesPlayed, deck.winRate])).toEqual([['b', 2, 100], ['a', 2, 50]]);
    expect(analytics.bracketWins).toEqual([{ bracket: '2', wins: 2 }, { bracket: '3', wins: 1 }]);
    expect(analytics.colorWinStats.find((entry) => entry.color === 'R')).toMatchObject({ gamesPlayed: 2, wins: 2, winRate: 100 });
  });

  it('uses color overrides and ignores missing deck rows', () => {
    expect(resolveDeckColorsForAnalytics(decks.get('a')!, new Map([['a', ['R']]]))).toEqual(['R']);
    const analytics = buildPersonalAnalytics([
      { deck_id: 'missing', is_winner: true }, { deck_id: 'a', is_winner: false },
    ], decks, new Map([['a', ['G']]]));
    expect(analytics.gamesPlayed).toBe(1);
    expect(analytics.colorStats).toEqual([{ color: 'G', gamesPlayed: 1, percentage: 100 }]);
    expect(analytics.longestWinStreak).toBe(0);
  });

  it('selects a best deck only after the minimum sample size', () => {
    const rows = Array.from({ length: PERSONAL_BEST_DECK_MIN_GAMES }, () => ({ deck_id: 'b', is_winner: true }));
    expect(buildPersonalAnalytics(rows, decks).bestDeck?.id).toBe('b');
    expect(buildPersonalAnalytics(rows.slice(1), decks).bestDeck).toBeNull();
  });

  it('calculates longest and current streak independently', () => {
    expect(calculateWinStreaks([true, true, false, true])).toEqual({ longest: 2, current: 1 });
    expect(calculateWinStreaks([])).toEqual({ longest: 0, current: 0 });
  });
});
