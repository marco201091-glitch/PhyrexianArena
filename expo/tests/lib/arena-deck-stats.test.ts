import { describe, expect, it } from 'vitest';
import { calculateCommanderStats } from '@/lib/arena-deck-stats';
import type { MatchParticipantRecord } from '@/lib/arena-participants';
import type { ArenaMatch } from '@/lib/types/arena';

function participant(commander: string, bracket: string | null, winner = false, guest = false): MatchParticipantRecord {
  const deck = { name: `${commander} deck`, commander, commander_image: `${commander}.jpg`, bracket };
  return {
    id: `${commander}-${bracket}-${winner}-${guest}`, user_id: guest ? null : commander, guest_id: guest ? commander : null,
    deck_id: guest ? null : `deck-${commander}`, guest_deck_id: guest ? `guest-deck-${commander}` : null,
    is_winner: winner, decks: guest ? null : deck, arena_guest_decks: guest ? deck : null,
  };
}

function match(id: string, matchParticipants: MatchParticipantRecord[]): ArenaMatch {
  return {
    id, group_id: 'g', winner_id: null, played_at: '2026-07-15T10:00:00.000Z',
    created_by: 'u', notes: null, winner: null, match_participants: matchParticipants,
  };
}

describe('arena commander stats', () => {
  const matches = [
    match('1', [participant('Atraxa', '3', true), participant('Krenko', '2')]),
    match('2', [participant('Atraxa', '3'), participant('Krenko', '2', true, true)]),
    match('3', [participant('Atraxa', '4', true)]),
  ];

  it('counts stable deck identities and includes guest decks', () => {
    expect(calculateCommanderStats(matches).map((entry) => [entry.key, entry.gamesPlayed, entry.wins, entry.winRate])).toEqual([
      ['guest:guest-deck-Krenko', 1, 1, 100], ['deck:deck-Atraxa', 3, 2, 67],
      ['deck:deck-Krenko', 1, 0, 0],
    ]);
  });

  it('filters brackets and supports every sort order without mutating results', () => {
    expect(calculateCommanderStats(matches, '2').map((entry) => entry.commander)).toEqual(['Krenko', 'Krenko']);
    expect(calculateCommanderStats(matches, 'all', 'gamesPlayed').map((entry) => entry.key)).toEqual([
      'deck:deck-Atraxa', 'guest:guest-deck-Krenko', 'deck:deck-Krenko',
    ]);
    expect(calculateCommanderStats(matches, 'all', 'winRate')).toHaveLength(3);
  });

  it('ignores participants without deck snapshots', () => {
    const empty = participant('Missing', null);
    empty.decks = null;
    expect(calculateCommanderStats([match('empty', [empty])])).toEqual([]);
  });
});
