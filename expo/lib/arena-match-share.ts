import {
  getParticipantDeckSnapshot,
  getParticipantDisplayName,
} from '@/lib/arena-participants';
import { getMatchWinnerName } from '@/lib/arena-stats';
import type { ArenaMatch } from '@/lib/types/arena';

export type MatchShareLabels = {
  matchTitle: string;
  playersAndDecks: string;
  noDeckSelected: string;
  winner: string;
  comment: string;
  noComment: string;
};

function formatPlayedAt(playedAt: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(playedAt));
}

export function buildMatchShareText(
  match: ArenaMatch,
  arenaName: string,
  labels: MatchShareLabels,
  locale: string,
) {
  const participants = match.match_participants
    .map((participant) => {
      const playerName = getParticipantDisplayName(participant);
      const deck = getParticipantDeckSnapshot(participant);
      const deckName = deck?.name?.trim() || labels.noDeckSelected;
      const commanderName = deck?.commander ? ` (${deck.commander})` : '';
      return `- ${playerName}: ${deckName}${commanderName}`;
    })
    .join('\n');

  const winnerName = getMatchWinnerName(match);
  const comment = match.notes?.trim() || labels.noComment;

  return [
    `${labels.matchTitle} - ${arenaName}`,
    formatPlayedAt(match.played_at, locale),
    '',
    labels.playersAndDecks,
    participants,
    '',
    `${labels.winner}: ${winnerName}`,
    '',
    `${labels.comment}:`,
    comment,
  ].join('\n');
}