export const ARENA_DAY_BOUNDARY_HOUR = 8;

function pad(value: number) {
  return String(value).padStart(2, '0');
}

export function getArenaDayKey(
  playedAt: string | Date,
  boundaryHour = ARENA_DAY_BOUNDARY_HOUR,
): string {
  const date = typeof playedAt === 'string' ? new Date(playedAt) : new Date(playedAt.getTime());
  const adjusted = new Date(date.getTime());

  if (adjusted.getUTCHours() < boundaryHour) {
    adjusted.setUTCDate(adjusted.getUTCDate() - 1);
  }

  return `${adjusted.getUTCFullYear()}-${pad(adjusted.getUTCMonth() + 1)}-${pad(adjusted.getUTCDate())}`;
}

function getCalendarDayKey(playedAt: string | Date): string {
  const date = typeof playedAt === 'string' ? new Date(playedAt) : new Date(playedAt.getTime());
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function getPreviousCalendarDayKey(playedAt: string | Date): string {
  const date = typeof playedAt === 'string' ? new Date(playedAt) : new Date(playedAt.getTime());
  date.setUTCDate(date.getUTCDate() - 1);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
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
  const calendarDaysWithMatches = new Set(matches.map((match) => getCalendarDayKey(match.played_at)));

  matches.forEach((match) => {
    const date = new Date(match.played_at);
    const isLateNightMatch = date.getUTCHours() < boundaryHour;
    const previousCalendarDayHasMatches = calendarDaysWithMatches.has(getPreviousCalendarDayKey(match.played_at));
    const key = isLateNightMatch && previousCalendarDayHasMatches
      ? getArenaDayKey(match.played_at, boundaryHour)
      : getCalendarDayKey(match.played_at);
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
