import { describe, expect, it } from 'vitest';
import {
  buildDeckWinRateMap,
  buildPersonalAnalytics,
  calculateWinStreaks,
  PERSONAL_BEST_DECK_MIN_GAMES,
  type PersonalDeckSnapshot,
  type PersonalMatchParticipantRow,
} from '@/lib/personal-analytics';

describe('personal-analytics', () => {
  const deckA: PersonalDeckSnapshot = {
    id: 'deck-a',
    name: 'Atraxa',
    commander: 'Atraxa, Praetors\' Voice',
    commander_image: null,
    color_identity: ['W', 'U', 'B', 'G'],
    bracket: '3',
    source_type: 'manual',
    source_url: null,
  };

  const deckB: PersonalDeckSnapshot = {
    id: 'deck-b',
    name: 'Korvold',
    commander: 'Korvold, Fae-Cursed King',
    commander_image: null,
    color_identity: ['B', 'R', 'G'],
    bracket: '4',
    source_type: 'manual',
    source_url: null,
  };

  const deckC: PersonalDeckSnapshot = {
    id: 'deck-c',
    name: 'Mono Red',
    commander: 'Purphoros',
    commander_image: null,
    color_identity: ['R'],
    bracket: '2',
    source_type: 'manual',
    source_url: null,
  };

  it('builds deck win rates', () => {
    const participants: PersonalMatchParticipantRow[] = [
      { deck_id: 'deck-a', is_winner: true },
      { deck_id: 'deck-a', is_winner: false },
      { deck_id: 'deck-b', is_winner: true },
    ];

    const map = buildDeckWinRateMap(participants);
    expect(map.get('deck-a')).toEqual({ gamesPlayed: 2, wins: 1, winRate: 50 });
    expect(map.get('deck-b')).toEqual({ gamesPlayed: 1, wins: 1, winRate: 100 });
  });

  it('aggregates personal analytics', () => {
    const participants: PersonalMatchParticipantRow[] = [
      { deck_id: 'deck-a', is_winner: true },
      { deck_id: 'deck-b', is_winner: false },
    ];

    const analytics = buildPersonalAnalytics(
      participants,
      new Map([
        ['deck-a', deckA],
        ['deck-b', deckB],
      ]),
    );

    expect(analytics.gamesPlayed).toBe(2);
    expect(analytics.wins).toBe(1);
    expect(analytics.uniqueDecks).toBe(2);
    expect(analytics.topDecks[0]?.commander).toContain('Atraxa');
    expect(analytics.colorStats.length).toBeGreaterThan(0);
    expect(analytics.bracketWins).toEqual([{ bracket: '3', wins: 1 }]);
    expect(analytics.colorWinStats.length).toBeGreaterThan(0);
    expect(analytics.longestWinStreak).toBe(0);
    expect(analytics.currentWinStreak).toBe(0);
    expect(analytics.bestDeck).toBeNull();
  });

  it('calculates win streaks chronologically', () => {
    const participants: PersonalMatchParticipantRow[] = [
      { deck_id: 'deck-a', is_winner: true, played_at: '2026-01-01T10:00:00Z' },
      { deck_id: 'deck-a', is_winner: true, played_at: '2026-01-02T10:00:00Z' },
      { deck_id: 'deck-b', is_winner: false, played_at: '2026-01-03T10:00:00Z' },
      { deck_id: 'deck-c', is_winner: true, played_at: '2026-01-04T10:00:00Z' },
      { deck_id: 'deck-c', is_winner: true, played_at: '2026-01-05T10:00:00Z' },
      { deck_id: 'deck-c', is_winner: true, played_at: '2026-01-06T10:00:00Z' },
    ];

    const analytics = buildPersonalAnalytics(
      participants,
      new Map([
        ['deck-a', deckA],
        ['deck-b', deckB],
        ['deck-c', deckC],
      ]),
    );

    expect(analytics.longestWinStreak).toBe(3);
    expect(analytics.currentWinStreak).toBe(3);
    expect(analytics.bracketWins).toEqual([
      { bracket: '2', wins: 3 },
      { bracket: '3', wins: 2 },
    ]);
  });

  it('picks the best deck only after the minimum game threshold', () => {
    const participants: PersonalMatchParticipantRow[] = [
      ...Array.from({ length: PERSONAL_BEST_DECK_MIN_GAMES }, () => ({
        deck_id: 'deck-c',
        is_winner: true,
      })),
      { deck_id: 'deck-a', is_winner: true },
      { deck_id: 'deck-a', is_winner: false },
    ];

    const analytics = buildPersonalAnalytics(
      participants,
      new Map([
        ['deck-a', deckA],
        ['deck-c', deckC],
      ]),
    );

    expect(analytics.bestDeck?.commander).toContain('Purphoros');
    expect(analytics.bestDeck?.winRate).toBe(100);
  });

  it('calculates streak helpers directly', () => {
    expect(calculateWinStreaks([true, true, false, true])).toEqual({
      longest: 2,
      current: 1,
    });
    expect(calculateWinStreaks([false, false])).toEqual({
      longest: 0,
      current: 0,
    });
  });
});