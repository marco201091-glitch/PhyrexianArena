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

function userParticipant(overrides: Partial<MatchParticipantRecord> = {}): MatchParticipantRecord {
  return {
    id: 'p1',
    user_id: 'user-1',
    guest_id: null,
    deck_id: 'deck-1',
    guest_deck_id: null,
    is_winner: false,
    profiles: { id: 'user-1', username: 'marco', display_name: 'Marco' },
    ...overrides,
  };
}

describe('arena-participants', () => {
  it('resolves participant keys and display names', () => {
    expect(getParticipantKey(userParticipant())).toBe('user:user-1');
    expect(getParticipantDisplayName(userParticipant())).toBe('Marco');
    expect(getParticipantDeckId(userParticipant())).toBe('deck-1');
  });

  it('prefers immutable match snapshots over later profile and deck edits', () => {
    const participant = userParticipant({
      participant_name_snapshot: 'Name at match time',
      deck_name_snapshot: 'Original deck',
      commander_snapshot: 'Original commander',
      commander_image_snapshot: 'https://cards.test/original.jpg',
      deck_bracket_snapshot: '3',
      color_identity_snapshot: ['U', 'B'],
      profiles: { id: 'user-1', username: 'new-name', display_name: 'New name' },
      decks: {
        name: 'Renamed deck',
        commander: 'New commander',
        commander_image: null,
        bracket: '5',
      },
    });

    expect(getParticipantDisplayName(participant)).toBe('Name at match time');
    expect(getParticipantDeckSnapshot(participant)).toMatchObject({
      name: 'Original deck',
      commander: 'Original commander',
      commander_image: 'https://cards.test/original.jpg',
      bracket: '3',
      color_identity: ['U', 'B'],
    });
  });

  it('resolves winner participant keys', () => {
    expect(resolveWinnerParticipantKey({
      winner_id: 'user-2',
      winner_guest_id: null,
      match_participants: [],
    })).toBe('user:user-2');

    expect(resolveWinnerParticipantKey({
      winner_id: null,
      winner_guest_id: 'guest-1',
      match_participants: [],
    })).toBe('guest:guest-1');
  });

  it('returns the latest deck selection for a participant', () => {
    const deckId = getLastDeckSelectionForParticipant('user:user-1', [
      {
        played_at: '2026-07-01T10:00:00.000Z',
        match_participants: [userParticipant({ deck_id: 'deck-old' })],
      },
      {
        played_at: '2026-07-08T10:00:00.000Z',
        match_participants: [userParticipant({ deck_id: 'deck-new' })],
      },
    ]);

    expect(deckId).toBe('deck-new');
  });
});
