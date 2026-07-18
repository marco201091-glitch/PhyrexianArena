import { getParticipantDeckSnapshot } from '@/lib/arena-participants';
import type { ArenaMatch } from '@/lib/types/arena';

export interface CommanderStats {
  key: string;
  commander: string;
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
  const commanderMap = new Map<string, CommanderStats>();

  matches.forEach((match) => {
    match.match_participants.forEach((participant) => {
      const deck = getParticipantDeckSnapshot(participant);
      if (!deck) return;
      if (bracketFilter !== 'all' && deck.bracket !== bracketFilter) return;

      const commander = deck.commander;
      const bracket = deck.bracket;
      const key = `${commander}::${bracket || 'none'}`;

      if (!commanderMap.has(key)) {
        commanderMap.set(key, {
          key,
          commander,
          commanderImageUrl: deck.commander_image,
          bracket,
          gamesPlayed: 0,
          wins: 0,
          winRate: 0,
        });
      }

      const stats = commanderMap.get(key)!;
      stats.gamesPlayed += 1;
      if (participant.is_winner) stats.wins += 1;
    });
  });

  const withRates = Array.from(commanderMap.values()).map((stats) => ({
    ...stats,
    winRate: stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0,
  }));

  return sortCommanderStats(withRates, deckStatsSort);
}
