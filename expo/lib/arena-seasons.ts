type ArenaSeasonRpcResult = PromiseLike<{ data: unknown; error: unknown }>;

type ArenaSeasonClient = {
  rpc: (functionName: string, parameters: Record<string, unknown>) => ArenaSeasonRpcResult;
};

export type ArenaSeasonArchive = {
  id: string;
  seasonStart: string;
  seasonEnd: string;
  resetMonth: number;
  summary: Record<string, unknown> & {
    totalMatches?: number;
    players?: Array<{ display_name?: string; games_played?: number; wins?: number }>;
    decks?: Array<{ deck_name?: string; commander?: string; games_played?: number; wins?: number }>;
    matches?: {
      draws?: number;
      trackedMatches?: number;
      totalDurationSeconds?: number;
      averageDurationSeconds?: number | null;
      participants?: number;
    };
  };
  archivedAt: string;
};

export function getArenaSeasonArchiveHighlights(archive: ArenaSeasonArchive) {
  const byPerformance = <T extends { games_played?: number; wins?: number }>(left: T, right: T) => {
    const leftGames = Number(left.games_played ?? 0);
    const rightGames = Number(right.games_played ?? 0);
    const leftWins = Number(left.wins ?? 0);
    const rightWins = Number(right.wins ?? 0);
    const leftRate = leftGames > 0 ? leftWins / leftGames : 0;
    const rightRate = rightGames > 0 ? rightWins / rightGames : 0;
    return rightRate - leftRate || rightWins - leftWins || rightGames - leftGames;
  };
  return {
    topPlayer: [...(archive.summary.players ?? [])].sort(byPerformance)[0] ?? null,
    topDeck: [...(archive.summary.decks ?? [])].sort(byPerformance)[0] ?? null,
  };
}

export type ArenaSeasonContext = {
  enabled: true;
  resetMonth: number;
  currentSeasonStart: string;
  currentSeasonEnd: string;
  archives: ArenaSeasonArchive[];
};

export const ARENA_SEASON_MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);

export function getArenaSeasonPeriod(resetMonth: number, at = new Date()) {
  if (!Number.isInteger(resetMonth) || resetMonth < 1 || resetMonth > 12) {
    throw new RangeError('Reset month must be an integer between 1 and 12.');
  }
  const currentYear = at.getUTCFullYear();
  const startYear = at.getUTCMonth() + 1 < resetMonth ? currentYear - 1 : currentYear;
  return {
    start: `${startYear}-${String(resetMonth).padStart(2, '0')}-01`,
    end: `${startYear + 1}-${String(resetMonth).padStart(2, '0')}-01`,
  };
}

export function laterIsoDate(left: string | null, right: string | null): string | null {
  if (!left) return right;
  if (!right) return left;
  return new Date(left).getTime() >= new Date(right).getTime() ? left : right;
}

export function formatArenaSeasonLabel(
  seasonStart: string,
  seasonEnd: string,
  locale: string,
): string {
  const start = new Date(`${seasonStart}T00:00:00Z`);
  const end = new Date(`${seasonEnd}T00:00:00Z`);
  const startYear = start.getUTCFullYear();
  const endYear = end.getUTCFullYear();
  const startsInJanuary = start.getUTCMonth() === 0;
  return startsInJanuary
    ? `${locale.startsWith('it') ? 'Stagione' : 'Season'} ${startYear}`
    : `${locale.startsWith('it') ? 'Stagione' : 'Season'} ${startYear}/${String(endYear).slice(-2)}`;
}

export function formatArenaSeasonDate(date: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}

export async function fetchArenaSeasonContext(
  client: ArenaSeasonClient,
  groupId: string,
): Promise<ArenaSeasonContext | null> {
  const { data, error } = await client.rpc('get_arena_season_context', { p_group_id: groupId });
  if (error) throw error;
  return parseArenaSeasonContext(data);
}

export function parseArenaSeasonContext(data: unknown): ArenaSeasonContext | null {
  if (!data || typeof data !== 'object') return null;
  if ('enabled' in data && data.enabled === false) return null;
  if (!('currentSeasonStart' in data) || !('currentSeasonEnd' in data)) return null;
  return { ...(data as Omit<ArenaSeasonContext, 'enabled'>), enabled: true };
}

export async function setArenaSeasonResetMonth(
  client: ArenaSeasonClient,
  groupId: string,
  resetMonth: number,
): Promise<ArenaSeasonContext | null> {
  if (!Number.isInteger(resetMonth) || resetMonth < 1 || resetMonth > 12) {
    throw new RangeError('Reset month must be an integer between 1 and 12.');
  }
  const { data, error } = await client.rpc('set_arena_season_reset_month', {
    p_group_id: groupId,
    p_reset_month: resetMonth,
  });
  if (error) throw error;
  return parseArenaSeasonContext(data);
}

export async function setArenaSeasonSettings(
  client: ArenaSeasonClient,
  groupId: string,
  enabled: boolean,
  resetMonth: number,
): Promise<ArenaSeasonContext | null> {
  if (!Number.isInteger(resetMonth) || resetMonth < 1 || resetMonth > 12) {
    throw new RangeError('Reset month must be an integer between 1 and 12.');
  }
  const { data, error } = await client.rpc('set_arena_season_settings', {
    p_group_id: groupId,
    p_enabled: enabled,
    p_reset_month: resetMonth,
  });
  if (error) throw error;
  return parseArenaSeasonContext(data);
}
