import { describe, expect, it } from 'vitest';
import {
  getLastDeckSelectionForParticipant,
  getParticipantDeckId,
  getParticipantDeckSnapshot,
  getParticipantDisplayName,
  getParticipantKey,
  resolveWinnerParticipantKey,
  type MatchParticipantRecord,
} from '@/lib/arena-participants';

function participant(overrides: Partial<MatchParticipantRecord> = {}): MatchParticipantRecord {
  return {
    id: 'participant-1',
    user_id: 'user-1',
    guest_id: null,
    deck_id: 'deck-1',
    guest_deck_id: null,
    is_winner: false,
    profiles: { id: 'user-1', username: 'marco', display_name: ' Marco ' },
    decks: {
      id: 'deck-1', name: 'Main deck', commander: 'Atraxa', commander_image: null,
      bracket: '3', color_identity: ['W', 'U'], source_type: 'manual',
    },
    ...overrides,
  };
}

describe('arena participants', () => {
  it('prefers guest identity and guest deck data when present', () => {
    const guest = participant({
      user_id: null,
      guest_id: 'guest-1',
      deck_id: null,
      guest_deck_id: 'guest-deck-1',
      profiles: null,
      decks: null,
      arena_guests: { id: 'guest-1', display_name: 'Visitor' },
      arena_guest_decks: {
        name: 'Borrowed', commander: 'Krenko', commander_image: 'image', bracket: '2',
        color_identity: ['R'],
      },
    });

    expect(getParticipantKey(guest)).toBe('guest:guest-1');
    expect(getParticipantDisplayName(guest)).toBe('Visitor');
    expect(getParticipantDeckId(guest)).toBe('guest-deck-1');
    expect(getParticipantDeckSnapshot(guest)).toMatchObject({
      id: 'guest-deck-1', name: 'Borrowed', commander: 'Krenko', source_type: 'guest',
    });
  });

  it('falls back from blank display names to username and handles empty identities', () => {
    const user = participant({ profiles: { id: 'user-1', username: 'fallback', display_name: '  ' } });
    const empty = participant({ user_id: null, deck_id: null, profiles: null, decks: null });
    expect(getParticipantDisplayName(user)).toBe('fallback');
    expect(getParticipantKey(empty)).toBeNull();
    expect(getParticipantDeckSnapshot(empty)).toBeNull();
  });

  it('finds the newest selected deck without mutating source match order', () => {
    const matches = [
      { played_at: '2026-07-10T12:00:00.000Z', match_participants: [participant({ deck_id: 'old' })] },
      { played_at: '2026-07-12T12:00:00.000Z', match_participants: [participant({ deck_id: 'new' })] },
    ];
    const originalOrder = matches.map((match) => match.played_at);
    expect(getLastDeckSelectionForParticipant('user:user-1', matches)).toBe('new');
    expect(matches.map((match) => match.played_at)).toEqual(originalOrder);
    expect(getLastDeckSelectionForParticipant('guest:missing', matches)).toBeNull();
  });

  it('resolves explicit winners before falling back to participant flags', () => {
    expect(resolveWinnerParticipantKey({
      winner_id: 'user-explicit', winner_guest_id: 'guest-explicit', match_participants: [],
    })).toBe('guest:guest-explicit');
    expect(resolveWinnerParticipantKey({
      winner_id: 'user-explicit', match_participants: [],
    })).toBe('user:user-explicit');
    expect(resolveWinnerParticipantKey({
      winner_id: null, match_participants: [participant({ guest_id: 'flagged', user_id: null, is_winner: true })],
    })).toBe('guest:flagged');
  });
});
