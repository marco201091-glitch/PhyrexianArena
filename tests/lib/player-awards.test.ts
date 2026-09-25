import { describe, expect, it } from 'vitest';
import { buildPlayerAwards } from '@/lib/player-awards';

const player = (id: string, name: string, overrides = {}) => ({ id, user_id: id, guest_id: null, deck_id: null, guest_deck_id: null, is_winner: false, profiles: { id, username: name, display_name: name }, ...overrides });

describe('player awards', () => {
  it('ranks maximum single-match life gain and starting-player selections', () => {
    const awards = buildPlayerAwards([
      { match_participants: [player('a', 'A', { life_gained: 18, was_starting_player: true }), player('b', 'B', { life_gained: 25 })] },
      { match_participants: [player('a', 'A', { life_gained: 4, was_starting_player: true }), player('b', 'B', { was_starting_player: true })] },
    ]);
    expect(awards.find((award) => award.kind === 'healing_master')).toMatchObject({ name: 'B', value: 25 });
    expect(awards.find((award) => award.kind === 'beginners_luck')).toMatchObject({ name: 'A', value: 2 });
  });
});
