import { describe, expect, it } from 'vitest';
import {
  getLastDeckSelectionForParticipant,
  getParticipantDeckId,
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