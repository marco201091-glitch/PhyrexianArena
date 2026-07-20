import { getParticipantDeckId, getParticipantDeckSnapshot } from '@/lib/arena-participants';
import type { ArenaMatch } from '@/lib/types/arena';

export type ArenaAwardKind = 'fastest' | 'group_slugger' | 'executioner' | 'runner_up';

export interface ArenaAward {
  kind: ArenaAwardKind;
  deckId: string;
  name: string;
  commander: string;
  commanderImage: string | null;
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
    commanderImage: string | null;
    trackedGames: number;
    winningDurations: number[];
    groupDamage: number;
    eliminations: number;
    secondPlaces: number;
  }>();

  matches.forEach((match) => {
    match.match_participants.forEach((participant) => {
      const deckId = getParticipantDeckId(participant);
      const deck = getParticipantDeckSnapshot(participant);
      if (!deckId || !deck) return;
      const entry = byDeck.get(deckId) || {
        deckId,
        name: deck.name,
        commander: deck.commander,
        commanderImage: deck.commander_image,
        trackedGames: 0,
        winningDurations: [],
        groupDamage: 0,
        eliminations: 0,
        secondPlaces: 0,
      };
      if (match.tracking_version != null || match.duration_seconds != null) {
        entry.trackedGames += 1;
        entry.groupDamage += participant.group_damage_dealt || 0;
        entry.eliminations += participant.eliminations_caused || 0;
        if (participant.placement === 2) entry.secondPlaces += 1;
        if (participant.is_winner && match.duration_seconds != null) {
          entry.winningDurations.push(match.duration_seconds);
        }
      }
      byDeck.set(deckId, entry);
    });
  });

  const eligible = Array.from(byDeck.values()).filter((deck) => deck.trackedGames >= 3);
  const awards: ArenaAward[] = [];
  const add = (kind: ArenaAwardKind, deck: typeof eligible[number] | undefined, value: number | null) => {
    if (!deck || value == null || value <= 0) return;
    awards.push({ kind, ...deck, value });
  };
  const fastest = eligible
    .map((deck) => ({ deck, value: median(deck.winningDurations) }))
    .filter((entry): entry is { deck: typeof eligible[number]; value: number } => entry.value != null)
    .sort((a, b) => a.value - b.value)[0];
  add('fastest', fastest?.deck, fastest?.value ?? null);
  const top = (selector: (deck: typeof eligible[number]) => number) =>
    [...eligible].sort((a, b) => selector(b) - selector(a) || b.trackedGames - a.trackedGames)[0];
  const slugger = top((deck) => deck.groupDamage);
  add('group_slugger', slugger, slugger?.groupDamage ?? null);
  const executioner = top((deck) => deck.eliminations);
  add('executioner', executioner, executioner?.eliminations ?? null);
  const runnerUp = top((deck) => deck.secondPlaces);
  add('runner_up', runnerUp, runnerUp?.secondPlaces ?? null);
  return awards;
}
