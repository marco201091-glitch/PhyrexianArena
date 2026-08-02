import { describe, expect, it } from 'vitest';
import { calculateArenaAwards } from '@/lib/arena-awards';
import type { ArenaMatch } from '@/lib/types/arena';

function match(
  id: string,
  overrides: Partial<ArenaMatch> = {},
): ArenaMatch {
  return {
    id,
    group_id: 'arena',
    winner_id: 'user',
    played_at: `2026-07-${id.padStart(2, '0')}T20:00:00.000Z`,
    created_by: 'manager',
    notes: null,
    duration_seconds: 3600,
    tracking_version: 2,
    win_condition: 'last_standing',
    winner: null,
    match_participants: [{
      id: `participant-${id}`,
      user_id: 'user',
      guest_id: null,
      deck_id: 'deck',
      guest_deck_id: null,
      is_winner: true,
      final_life: 8,
      decks: {
        id: 'deck',
        name: 'Only Deck',
        commander: 'Commander',
        commander_image: null,
        bracket: null,
      },
    }],
    ...overrides,
  };
}

describe('arena awards', () => {
  it('counts records and the new win conditions', () => {
    const matches = [
      match('1', { win_condition: 'combo' }),
      match('2', { win_condition: 'alternate_card' }),
      match('3'),
      match('4', { duration_seconds: null, tracking_version: null }),
    ];

    const awards = calculateArenaAwards(matches);
    const values = Object.fromEntries(awards.map((award) => [award.kind, award.value]));

    expect(values.comebacker).toBe(3);
    expect(values.one_trick).toBe(4);
    expect(values.combo_winner).toBe(1);
    expect(values.junk_master).toBe(1);
  });

  it('counts the earliest eliminated deck as Archenemy', () => {
    const matches = ['1', '2', '3'].map((id) => match(id, {
      match_participants: [
        {
          id: `loser-${id}`,
          user_id: 'loser',
          guest_id: null,
          deck_id: 'target',
          guest_deck_id: null,
          is_winner: false,
          eliminated_at: `2026-07-${id.padStart(2, '0')}T20:10:00.000Z`,
          decks: { id: 'target', name: 'Target', commander: 'Target Commander', commander_image: null, bracket: null },
        },
        {
          id: `winner-${id}`,
          user_id: 'user',
          guest_id: null,
          deck_id: 'deck',
          guest_deck_id: null,
          is_winner: true,
          eliminated_at: null,
          decks: { id: 'deck', name: 'Winner', commander: 'Winner Commander', commander_image: null, bracket: null },
        },
      ],
    }));

    expect(calculateArenaAwards(matches).find((award) => award.kind === 'archenemy')).toMatchObject({
      deckId: 'target',
      value: 3,
    });
  });

  it('returns gold, silver, and bronze for each award', () => {
    const matches = ['1', '2', '3'].map((id) => match(id, {
      match_participants: [40, 30, 20, 10].map((damage, index) => ({
        id: `participant-${id}-${index}`,
        user_id: `user-${index}`,
        guest_id: null,
        deck_id: `deck-${index}`,
        guest_deck_id: null,
        is_winner: index === 0,
        group_damage_dealt: damage,
        decks: {
          id: `deck-${index}`,
          name: `Deck ${index}`,
          commander: `Commander ${index}`,
          commander_image: null,
          bracket: null,
        },
      })),
    }));

    const podium = calculateArenaAwards(matches).filter((award) => award.kind === 'group_slugger');
    expect(podium.map((award) => ({ rank: award.rank, deckId: award.deckId, value: award.value }))).toEqual([
      { rank: 1, deckId: 'deck-0', value: 120 },
      { rank: 2, deckId: 'deck-1', value: 90 },
      { rank: 3, deckId: 'deck-2', value: 60 },
    ]);
  });
});
