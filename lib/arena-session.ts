export const ARENA_DAY_BOUNDARY_HOUR = 8;

function pad(value: number) {
  return String(value).padStart(2, '0');
}

export function getArenaDayKey(
  playedAt: string | Date,
  boundaryHour = ARENA_DAY_BOUNDARY_HOUR,
): string {
  const date = typeof playedAt === 'string' ? new Date(playedAt) : new Date(playedAt.getTime());
  const adjusted = new Date(date);

  if (adjusted.getHours() < boundaryHour) {
    adjusted.setDate(adjusted.getDate() - 1);
  }

  return `${adjusted.getFullYear()}-${pad(adjusted.getMonth() + 1)}-${pad(adjusted.getDate())}`;
}

export interface ArenaMatchDayGroup<T extends { played_at: string }> {
  dayKey: string;
  label: string;
  matchCount: number;
  matches: T[];
}

export function groupMatchesByDay<T extends { played_at: string }>(
  matches: T[],
  options?: {
    boundaryHour?: number;
    formatLabel?: (dayKey: string) => string;
  },
): ArenaMatchDayGroup<T>[] {
  const boundaryHour = options?.boundaryHour ?? ARENA_DAY_BOUNDARY_HOUR;
  const groups = new Map<string, T[]>();

  matches.forEach((match) => {
    const key = getArenaDayKey(match.played_at, boundaryHour);
    const current = groups.get(key) || [];
    current.push(match);
    groups.set(key, current);
  });

  return Array.from(groups.entries())
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([dayKey, groupMatches]) => ({
      dayKey,
      label: options?.formatLabel?.(dayKey) ?? dayKey,
      matchCount: groupMatches.length,
      matches: groupMatches,
    }));
}