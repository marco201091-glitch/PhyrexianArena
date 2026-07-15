import { describe, expect, it } from 'vitest';
import { calculatePlayerStats, formatMatchParticipantsSummary, getMatchWinnerName, getPlayerRank } from '@/lib/arena-stats';
import type { MatchParticipantRecord } from '@/lib/arena-participants';
import type { ArenaMatch, PlayerStats } from '@/lib/types/arena';

function player(id: string, winner = false, guest = false): MatchParticipantRecord {
  return {
    id: `p-${id}`, user_id: guest ? null : id, guest_id: guest ? id : null,
    deck_id: guest ? null : `d-${id}`, guest_deck_id: guest ? `gd-${id}` : null,
    is_winner: winner,
    profiles: guest ? null : { id, username: id, display_name: id.toUpperCase() },
    arena_guests: guest ? { id, display_name: `Guest ${id}` } : null,
    decks: guest ? null : { name: `Deck ${id}`, commander: `Commander ${id}`, commander_image: null, bracket: '3' },
    arena_guest_decks: guest ? { name: `Guest deck ${id}`, commander: `Guest commander ${id}`, commander_image: null, bracket: '2' } : null,
  };
}

function match(id: string, participants: MatchParticipantRecord[], overrides: Partial<ArenaMatch> = {}): ArenaMatch {
  return {
    id, group_id: 'g', winner_id: null, played_at: '2026-07-15T12:00:00.000Z',
    created_by: 'a', notes: null, winner: null, match_participants: participants, ...overrides,
  };
}

describe('arena stats', () => {
  it('calculates and sorts user and guest win rates', () => {
    const stats = calculatePlayerStats([
      match('1', [player('a', true), player('b'), player('c', false, true)]),
      match('2', [player('a'), player('b', true)]),
      match('3', [player('a', true), player('b')]),
    ]);
    expect(stats.map((entry) => [entry.key, entry.gamesPlayed, entry.wins, entry.winRate])).toEqual([
      ['user:a', 3, 2, 67], ['user:b', 3, 1, 33], ['guest:c', 1, 0, 0],
    ]);
    expect(stats[2]).toMatchObject({ isGuest: true, profile: null });
  });

  it('uses competition ranking for exact ties', () => {
    const stats = [
      { winRate: 75, wins: 3, gamesPlayed: 4 },
      { winRate: 75, wins: 3, gamesPlayed: 4 },
      { winRate: 50, wins: 2, gamesPlayed: 4 },
    ] as PlayerStats[];
    expect(stats.map((_, index) => getPlayerRank(stats, index))).toEqual([1, 1, 3]);
  });

  it('formats draw, guest, profile fallback, and participant summaries', () => {
    expect(getMatchWinnerName(match('draw', [], { is_draw: true }), 'Pareggio')).toBe('Pareggio');
    expect(getMatchWinnerName(match('guest', [], { winner_guest: { id: 'g', display_name: 'Visitor' } }))).toBe('Visitor');
    expect(getMatchWinnerName(match('user', [], { winner: { id: 'u', username: 'fallback', display_name: '  ' } }))).toBe('fallback');
    expect(formatMatchParticipantsSummary(match('summary', [player('a', true), player('c', false, true)])))
      .toBe('A (Commander a) ★ · Guest c (Guest commander c)');
  });
});
