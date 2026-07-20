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
      'group_slugger', 'executioner',
    ]);
  });
});
