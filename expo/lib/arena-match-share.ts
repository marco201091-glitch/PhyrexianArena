import {
  getParticipantDeckSnapshot,
  getParticipantDisplayName,
} from '@/lib/arena-participants';
import { getMatchWinnerName } from '@/lib/arena-stats';
import { formatGameDuration } from '@/lib/live-game-duration';
import type { ArenaMatch } from '@/lib/types/arena';

export type MatchShareLabels = {
  matchTitle: string;
  playersAndDecks: string;
  noDeckSelected: string;
  winner: string;
  draw: string;
  comment: string;
  noComment: string;
  duration: string;
  damageDealt: string;
  eliminations: string;
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
      const placement = participant.placement ? ` #${participant.placement}` : '';
      const trackedStats = match.tracking_version != null || match.duration_seconds != null
        ? ` · ${labels.damageDealt} ${participant.life_damage_dealt || 0} · ${labels.eliminations} ${participant.eliminations_caused || 0}`
        : '';
      return `- ${playerName}${placement}: ${deckName}${commanderName}${trackedStats}`;
    })
    .join('\n');

  const winnerName = getMatchWinnerName(match, labels.draw);
  const comment = match.notes?.trim() || labels.noComment;

  const summary = [
    `${labels.matchTitle} - ${arenaName}`,
    formatPlayedAt(match.played_at, locale),
  ];
  if (match.duration_seconds != null) {
    summary.push(`${labels.duration}: ${formatGameDuration(match.duration_seconds)}`);
  }

  return [
    ...summary,
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
