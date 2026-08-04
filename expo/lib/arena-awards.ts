import { getParticipantDeckId, getParticipantDeckSnapshot, getParticipantDisplayName } from '@/lib/arena-participants';
import type { ArenaMatch } from '@/lib/types/arena';

export type ArenaAwardKind =
  | 'fastest'
  | 'group_slugger'
  | 'executioner'
  | 'runner_up'
  | 'archenemy'
  | 'comebacker'
  | 'one_trick'
  | 'combo_winner'
  | 'junk_master';

export interface ArenaAward {
  kind: ArenaAwardKind;
  rank: number;
  deckId: string;
  name: string;
  commander: string;
  ownerDisplayName: string;
  commanderImage: string | null;
  gamesPlayed: number;
  trackedGames: number;
  value: number;
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

export function calculateArenaAwards(matches: ArenaMatch[]): ArenaAward[] {
  const byDeck = new Map<string, {
    deckId: string;
    name: string;
    commander: string;
    ownerDisplayName: string;
    commanderImage: string | null;
    gamesPlayed: number;
    trackedGames: number;
    winningDurations: number[];
    groupDamage: number;
    eliminations: number;
    secondPlaces: number;
    firstEliminations: number;
    comebackWins: number;
    comboWins: number;
    alternateWins: number;
  }>();

  matches.forEach((match) => {
    const firstEliminatedAt = match.match_participants
      .map((participant) => participant.eliminated_at)
      .filter((value): value is string => Boolean(value))
      .sort()[0] ?? null;

    match.match_participants.forEach((participant) => {
      const deckId = getParticipantDeckId(participant);
      const deck = getParticipantDeckSnapshot(participant);
      if (!deckId || !deck) return;
      const entry = byDeck.get(deckId) || {
        deckId,
        name: deck.name,
        commander: deck.commander,
        ownerDisplayName: getParticipantDisplayName(participant),
        commanderImage: deck.commander_image,
        gamesPlayed: 0,
        trackedGames: 0,
        winningDurations: [],
        groupDamage: 0,
        eliminations: 0,
        secondPlaces: 0,
        firstEliminations: 0,
        comebackWins: 0,
        comboWins: 0,
        alternateWins: 0,
      };
      entry.gamesPlayed += 1;
      if (participant.is_winner && match.win_condition === 'combo') entry.comboWins += 1;
      if (participant.is_winner && match.win_condition === 'alternate_card') entry.alternateWins += 1;
      if (match.tracking_version != null || match.duration_seconds != null) {
        entry.trackedGames += 1;
        entry.groupDamage += participant.group_damage_dealt || 0;
        entry.eliminations += participant.eliminations_caused || 0;
        if (participant.placement === 2) entry.secondPlaces += 1;
        if (firstEliminatedAt && participant.eliminated_at === firstEliminatedAt) {
          entry.firstEliminations += 1;
        }
        if (participant.is_winner && participant.final_life != null && participant.final_life < 10) {
          entry.comebackWins += 1;
        }
        if (participant.is_winner && match.duration_seconds != null) {
          entry.winningDurations.push(match.duration_seconds);
        }
      }
      byDeck.set(deckId, entry);
    });
  });

  const eligible = Array.from(byDeck.values()).filter((deck) => deck.trackedGames >= 3);
  const awards: ArenaAward[] = [];
  const addRanked = (
    kind: ArenaAwardKind,
    entries: { deck: typeof eligible[number]; value: number }[],
  ) => {
    entries.slice(0, 3).forEach(({ deck, value }, index) => {
      if (value > 0) awards.push({ kind, rank: index + 1, ...deck, value });
    });
  };
  const fastest = eligible
    .map((deck) => ({ deck, value: median(deck.winningDurations) }))
    .filter((entry): entry is { deck: typeof eligible[number]; value: number } => entry.value != null)
    .sort((a, b) => a.value - b.value || b.deck.winningDurations.length - a.deck.winningDurations.length || a.deck.deckId.localeCompare(b.deck.deckId));
  addRanked('fastest', fastest);
  const top = (selector: (deck: typeof eligible[number]) => number) =>
    [...eligible]
      .filter((deck) => selector(deck) > 0)
      .sort((a, b) => selector(b) - selector(a) || b.trackedGames - a.trackedGames || a.deckId.localeCompare(b.deckId))
      .map((deck) => ({ deck, value: selector(deck) }));
  addRanked('group_slugger', top((deck) => deck.groupDamage));
  addRanked('executioner', top((deck) => deck.eliminations));
  addRanked('runner_up', top((deck) => deck.secondPlaces));
  addRanked('archenemy', top((deck) => deck.firstEliminations));
  addRanked('comebacker', top((deck) => deck.comebackWins));
  const allDecks = Array.from(byDeck.values());
  const topAll = (selector: (deck: typeof allDecks[number]) => number) =>
    [...allDecks]
      .filter((deck) => selector(deck) > 0)
      .sort((a, b) => selector(b) - selector(a) || b.gamesPlayed - a.gamesPlayed || a.deckId.localeCompare(b.deckId))
      .map((deck) => ({ deck, value: selector(deck) }));
  addRanked('one_trick', topAll((deck) => deck.gamesPlayed));
  addRanked('combo_winner', topAll((deck) => deck.comboWins));
  addRanked('junk_master', topAll((deck) => deck.alternateWins));
  return awards;
}
