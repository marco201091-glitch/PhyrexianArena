export interface ArenaShareParticipant {
  displayName: string;
  commander?: string | null;
  deckName?: string | null;
  isWinner: boolean;
  bracket?: string | null;
}

export interface ArenaShareMatch {
  playedAt: string;
  notes?: string | null;
  winnerName: string;
  participants: ArenaShareParticipant[];
}

export interface ArenaSharePlayerStat {
  displayName: string;
  gamesPlayed: number;
  wins: number;
  winRate: number;
}

export interface ArenaShareCommanderStat {
  commander: string;
  gamesPlayed: number;
  wins: number;
  winRate: number;
  bracket?: string | null;
}

export interface ArenaShareColorStat {
  label: string;
  gamesPlayed: number;
  percentage: number;
}

export interface ArenaSharePayload {
  arenaName: string;
  periodLabel: string;
  totalMatches: number;
  topPlayers: ArenaSharePlayerStat[];
  topDecks: ArenaShareCommanderStat[];
  topColors: ArenaShareColorStat[];
  recentMatches: ArenaShareMatch[];
  publicUrl?: string | null;
}

interface ArenaShareLabels {
  arenaStatsTitle: string;
  period: string;
  totalMatches: string;
  topPlayers: string;
  topDecks: string;
  topColors: string;
  recentMatches: string;
  winner: string;
  winRate: string;
  publicPage: string;
  noComment: string;
}

function formatShareDate(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso));
}

export function buildArenaShareText(payload: ArenaSharePayload, labels: ArenaShareLabels, locale = 'en-US') {
  const lines: string[] = [
    `${labels.arenaStatsTitle} - ${payload.arenaName}`,
    `${labels.period}: ${payload.periodLabel}`,
    `${labels.totalMatches}: ${payload.totalMatches}`,
    '',
    labels.topPlayers,
  ];

  payload.topPlayers.slice(0, 5).forEach((player, index) => {
    lines.push(`${index + 1}. ${player.displayName} - ${player.winRate}% (${player.wins}W / ${player.gamesPlayed}G)`);
  });

  lines.push('', labels.topDecks);
  payload.topDecks.slice(0, 5).forEach((deck, index) => {
    const bracket = deck.bracket ? ` [B${deck.bracket}]` : '';
    lines.push(`${index + 1}. ${deck.commander}${bracket} - ${deck.winRate}% (${deck.wins}W / ${deck.gamesPlayed}G)`);
  });

  if (payload.topColors.length > 0) {
    lines.push('', labels.topColors);
    payload.topColors.slice(0, 5).forEach((color) => {
      lines.push(`- ${color.label}: ${color.gamesPlayed} (${color.percentage}%)`);
    });
  }

  if (payload.recentMatches.length > 0) {
    lines.push('', labels.recentMatches);
    payload.recentMatches.slice(0, 3).forEach((match) => {
      lines.push(`• ${formatShareDate(match.playedAt, locale)} - ${labels.winner}: ${match.winnerName}`);
      match.participants.forEach((participant) => {
        const deckLabel = participant.commander
          ? `${participant.deckName || participant.commander} (${participant.commander})`
          : participant.deckName || '—';
        lines.push(`  - ${participant.displayName}: ${deckLabel}`);
      });
      if (match.notes?.trim()) {
        lines.push(`  ${match.notes.trim()}`);
      }
    });
  }

  if (payload.publicUrl) {
    lines.push('', `${labels.publicPage}: ${payload.publicUrl}`);
  }

  return lines.join('\n');
}