export interface ArenaSessionExportParticipant {
  displayName: string;
  commanderLabel: string;
}

export interface ArenaSessionExportMatch {
  participants: ArenaSessionExportParticipant[];
  notes?: string | null;
}

export function buildParticipantBullets(participants: ArenaSessionExportParticipant[]) {
  return participants
    .map((participant) => `- ${participant.displayName} ${participant.commanderLabel}`.trim())
    .join('\n');
}

export function buildArenaSessionExportText(
  customIntro: string,
  matches: ArenaSessionExportMatch[],
) {
  const lines: string[] = [];
  const intro = customIntro.trim();

  if (intro) {
    lines.push(intro);
    lines.push('');
  }

  matches.forEach((match, index) => {
    lines.push(buildParticipantBullets(match.participants));

    const comment = match.notes?.trim();
    if (comment) {
      lines.push('');
      lines.push(comment);
    }

    if (index < matches.length - 1) {
      lines.push('');
    }
  });

  return lines.join('\n');
}