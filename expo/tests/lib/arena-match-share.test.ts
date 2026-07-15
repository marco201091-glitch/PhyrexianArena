import { describe, expect, it } from 'vitest';
import { buildMatchShareText } from '@/lib/arena-match-share';
import type { ArenaMatch } from '@/lib/types/arena';

const labels = {
  matchTitle: 'Match', playersAndDecks: 'Players', noDeckSelected: 'No deck',
  winner: 'Winner', draw: 'Draw', comment: 'Comment', noComment: 'No comment',
};

function makeMatch(overrides: Partial<ArenaMatch> = {}): ArenaMatch {
  return {
    id: 'm', group_id: 'g', winner_id: 'u', played_at: '2026-07-08T20:00:00.000Z',
    created_by: 'u', notes: '  Close game  ',
    winner: { id: 'u', username: 'marco', display_name: 'Marco' },
    match_participants: [{
      id: 'p', user_id: 'u', guest_id: null, deck_id: 'd', guest_deck_id: null, is_winner: true,
      profiles: { id: 'u', username: 'marco', display_name: 'Marco' },
      decks: { name: 'Superfriends', commander: 'Atraxa', commander_image: null, bracket: '3' },
    }],
    ...overrides,
  };
}

describe('match share text', () => {
  it('formats player, deck, commander, winner and trimmed comment', () => {
    const text = buildMatchShareText(makeMatch(), 'Friday Night', labels, 'en-US');
    expect(text).toContain('Match - Friday Night');
    expect(text).toContain('- Marco: Superfriends (Atraxa)');
    expect(text).toContain('Winner: Marco');
    expect(text).toContain('Comment:\nClose game');
  });

  it('uses draw, no-deck, and no-comment fallbacks', () => {
    const base = makeMatch();
    const text = buildMatchShareText(makeMatch({
      is_draw: true, winner_id: null, winner: null, notes: ' ',
      match_participants: [{ ...base.match_participants[0]!, deck_id: null, decks: null }],
    }), 'Arena', labels, 'en-US');
    expect(text).toContain('- Marco: No deck');
    expect(text).toContain('Winner: Draw');
    expect(text).toContain('Comment:\nNo comment');
  });
});
