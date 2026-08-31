import { describe, expect, it } from 'vitest';
import { matchesLiveGameDeckSearch } from '@/lib/live-game-deck-search';

const deck = { name: 'Graveyard Value', commander: 'Meren of Clan Nel Toth' };

describe('live-game deck search', () => {
  it('matches deck and commander names without case sensitivity', () => {
    expect(matchesLiveGameDeckSearch(deck, 'graveyard')).toBe(true);
    expect(matchesLiveGameDeckSearch(deck, 'MEREN')).toBe(true);
    expect(matchesLiveGameDeckSearch(deck, '  clan nel  ')).toBe(true);
  });

  it('keeps all decks for an empty query and rejects unrelated text', () => {
    expect(matchesLiveGameDeckSearch(deck, '   ')).toBe(true);
    expect(matchesLiveGameDeckSearch(deck, 'Atraxa')).toBe(false);
  });
});
