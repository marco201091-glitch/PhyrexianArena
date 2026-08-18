import { describe, expect, it } from 'vitest';
import {
  DECK_RANKING_MIN_GAMES,
  countProvisionalDeckRankings,
  filterDeckRankings,
  isProvisionalDeckRanking,
} from '@/lib/deck-ranking-visibility';

describe('deck ranking visibility', () => {
  const decks = [{ id: 'new', gamesPlayed: 4 }, { id: 'ranked', gamesPlayed: 5 }];

  it('hides samples below five games by default', () => {
    expect(DECK_RANKING_MIN_GAMES).toBe(5);
    expect(filterDeckRankings(decks, false).map((deck) => deck.id)).toEqual(['ranked']);
    expect(countProvisionalDeckRankings(decks)).toBe(1);
  });

  it('shows and flags provisional samples on request', () => {
    expect(filterDeckRankings(decks, true)).toEqual(decks);
    expect(isProvisionalDeckRanking(4)).toBe(true);
    expect(isProvisionalDeckRanking(5)).toBe(false);
  });
});
