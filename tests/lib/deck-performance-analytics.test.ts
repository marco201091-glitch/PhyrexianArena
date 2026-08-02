import { describe, expect, it } from 'vitest';
import {
  buildArenaAwards,
  buildDeckPerformanceStats,
  type DeckPerformanceInputRow,
} from '@/lib/deck-performance-analytics';

function row(overrides: Partial<DeckPerformanceInputRow> = {}): DeckPerformanceInputRow {
  return {
    deck_id: 'deck-a',
    guest_deck_id: null,
    deck_name: 'Slug Life',
    guest_deck_name: null,
    deck_commander: 'Mogis',
    guest_deck_commander: null,
    deck_commander_image: null,
    guest_deck_commander_image: null,
    is_winner: false,
    placement: null,
    duration_seconds: 3600,
    tracking_version: 2,
    life_lost: 30,
    life_gained: 0,
    life_damage_dealt: 60,
    commander_damage_dealt: 0,
    infect_dealt: 0,
    eliminations_caused: 1,
    group_damage_dealt: 40,
    group_damage_events: 3,
    ...overrides,
  };
}

describe('deck performance analytics', () => {
  it('uses compact tracked metrics and reports unobtrusive coverage', () => {
    const stats = buildDeckPerformanceStats([
      row({ is_winner: true, duration_seconds: 1800 }),
      row({ placement: 2, duration_seconds: 2400 }),
      row({ is_winner: true, duration_seconds: 3000 }),
      row({ tracking_version: null, duration_seconds: null, life_damage_dealt: 0, group_damage_dealt: 0 }),
    ])[0];

    expect(stats.gamesPlayed).toBe(4);
    expect(stats.trackedGames).toBe(3);
    expect(stats.trackingCoverage).toBe(75);
    expect(stats.secondPlaces).toBe(1);
    expect(stats.medianWinningDurationSeconds).toBe(2400);
  });

  it('awards only decks with at least three tracked games', () => {
    const decks = buildDeckPerformanceStats([row(), row(), row()]);
    expect(buildArenaAwards(decks).map((award) => award.kind)).toEqual([
      'group_slugger', 'executioner', 'one_trick',
    ]);
  });

  it('adds extended tracked and all-record awards', () => {
    const [deck] = buildDeckPerformanceStats([row(), row(), row()]);
    deck.firstEliminations = 2;
    deck.comebackWins = 1;
    deck.comboWins = 3;
    deck.alternateWins = 2;

    expect(buildArenaAwards([deck]).map((award) => award.kind)).toEqual([
      'group_slugger',
      'executioner',
      'archenemy',
      'comebacker',
      'one_trick',
      'combo_winner',
      'junk_master',
    ]);
  });

  it('returns a deterministic top-three podium for each award', () => {
    const decks = buildDeckPerformanceStats([
      ...Array.from({ length: 3 }, () => row({ deck_id: 'deck-a', deck_name: 'A', group_damage_dealt: 40 })),
      ...Array.from({ length: 3 }, () => row({ deck_id: 'deck-b', deck_name: 'B', group_damage_dealt: 30 })),
      ...Array.from({ length: 3 }, () => row({ deck_id: 'deck-c', deck_name: 'C', group_damage_dealt: 20 })),
      ...Array.from({ length: 3 }, () => row({ deck_id: 'deck-d', deck_name: 'D', group_damage_dealt: 10 })),
    ]);

    const podium = buildArenaAwards(decks).filter((award) => award.kind === 'group_slugger');
    expect(podium.map((award) => ({ rank: award.rank, deckId: award.deck.deckId, value: award.value }))).toEqual([
      { rank: 1, deckId: 'deck-a', value: 120 },
      { rank: 2, deckId: 'deck-b', value: 90 },
      { rank: 3, deckId: 'deck-c', value: 60 },
    ]);
  });
});
