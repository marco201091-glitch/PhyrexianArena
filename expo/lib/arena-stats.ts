import {
  getParticipantDeckSnapshot,
  getParticipantDisplayName,
  getParticipantKey,
  type MatchParticipantRecord,
} from '@/lib/arena-participants';
import type { ArenaMatch, PlayerStats } from '@/lib/types/arena';

export function getPlayerRank(stats: PlayerStats[], index: number): number {
  const entry = stats[index];
  if (!entry) return index + 1;

  for (let i = 0; i < index; i += 1) {
    const previous = stats[i];
    if (
      previous.winRate === entry.winRate
      && previous.wins === entry.wins
      && previous.gamesPlayed === entry.gamesPlayed
    ) {
      return getPlayerRank(stats, i);
    }
  }

  return index + 1;
}

export function calculatePlayerStats(matches: ArenaMatch[]): PlayerStats[] {
  const playerMap = new Map<string, PlayerStats>();

  matches.forEach((match) => {
    match.match_participants.forEach((participant) => {
      const participantKey = getParticipantKey(participant);
      if (!participantKey) return;

      if (!playerMap.has(participantKey)) {
        const isGuest = Boolean(participant.guest_id);
        playerMap.set(participantKey, {
          key: participantKey,
          displayName: getParticipantDisplayName(participant),
          isGuest,
          profile: isGuest ? null : (participant.profiles || null),
          gamesPlayed: 0,
          wins: 0,
          winRate: 0,
        });
      }

      const stats = playerMap.get(participantKey)!;
      stats.gamesPlayed += 1;
      if (participant.is_winner) stats.wins += 1;
    });
  });

  return Array.from(playerMap.values())
    .map((stats) => ({
      ...stats,
      winRate: stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0,
    }))
    .sort((a, b) => b.winRate - a.winRate || b.wins - a.wins || b.gamesPlayed - a.gamesPlayed);
}

export function getMatchWinnerName(match: ArenaMatch) {
  if (match.winner_guest?.display_name) return match.winner_guest.display_name;
  return match.winner?.display_name?.trim() || match.winner?.username || '';
}

export function formatMatchParticipantsSummary(match: ArenaMatch) {
  return match.match_participants
    .map((participant) => {
      const name = getParticipantDisplayName(participant);
      const deck = getParticipantDeckSnapshot(participant);
      const commander = deck?.commander ? ` (${deck.commander})` : '';
      const winnerMark = participant.is_winner ? ' ★' : '';
      return `${name}${commander}${winnerMark}`;
    })
    .join(' · ');
}