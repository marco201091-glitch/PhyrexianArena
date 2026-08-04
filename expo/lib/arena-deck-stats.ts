import { getParticipantDeckId, getParticipantDeckSnapshot, getParticipantDisplayName } from '@/lib/arena-participants';
import type { ArenaMatch } from '@/lib/types/arena';

export interface CommanderStats {
  key: string;
  commander: string;
  ownerDisplayName: string;
  commanderImageUrl: string | null;
  bracket: string | null;
  gamesPlayed: number;
  wins: number;
  winRate: number;
}

export type DeckStatsSort = 'winRate' | 'gamesPlayed';

function sortCommanderStats(stats: CommanderStats[], deckStatsSort: DeckStatsSort) {
  return [...stats].sort((a, b) => {
    if (deckStatsSort === 'gamesPlayed') {
      return b.gamesPlayed - a.gamesPlayed || b.wins - a.wins || b.winRate - a.winRate;
    }
    return b.winRate - a.winRate || b.wins - a.wins || b.gamesPlayed - a.gamesPlayed;
  });
}

export function calculateCommanderStats(
  matches: ArenaMatch[],
  bracketFilter = 'all',
  deckStatsSort: DeckStatsSort = 'winRate',
): CommanderStats[] {
  const deckMap = new Map<string, CommanderStats>();

  matches.forEach((match) => {
    match.match_participants.forEach((participant) => {
      const deck = getParticipantDeckSnapshot(participant);
      const deckId = getParticipantDeckId(participant);
      if (!deck || !deckId) return;
      if (bracketFilter !== 'all' && deck.bracket !== bracketFilter) return;

      const key = deckId;

      if (!deckMap.has(key)) {
        deckMap.set(key, {
          key,
          commander: deck.commander,
          ownerDisplayName: getParticipantDisplayName(participant),
          commanderImageUrl: deck.commander_image,
          bracket: deck.bracket,
          gamesPlayed: 0,
          wins: 0,
          winRate: 0,
        });
      }

      const stats = deckMap.get(key)!;
      stats.gamesPlayed += 1;
      if (participant.is_winner) stats.wins += 1;
    });
  });

  const withRates = Array.from(deckMap.values()).map((stats) => ({
    ...stats,
    winRate: stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0,
  }));

  return sortCommanderStats(withRates, deckStatsSort);
}
