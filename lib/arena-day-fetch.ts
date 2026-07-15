import { ARENA_DAY_BOUNDARY_HOUR, getArenaDayKey } from '@/lib/arena-session';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface ArenaDaySummary {
  dayKey: string;
  matchCount: number;
  latestPlayedAt: string;
}

export function getDayPlayedAtRange(dayKey: string, boundaryHour = ARENA_DAY_BOUNDARY_HOUR) {
  const [year, month, day] = dayKey.split('-').map(Number);
  const start = new Date(Date.UTC(year, month - 1, day, boundaryHour, 0, 0, 0));
  const end = new Date(Date.UTC(year, month - 1, day + 1, boundaryHour, 0, 0, 0));
  return { start, end };
}

export async function fetchArenaDaySummaries(
  supabase: SupabaseClient,
  groupId: string,
): Promise<ArenaDaySummary[]> {
  const { data, error } = await supabase.rpc('get_arena_match_day_summaries', {
    p_group_id: groupId,
    p_boundary_hour: ARENA_DAY_BOUNDARY_HOUR,
  });

  if (!error) {
    return ((data || []) as Array<{ day_key: string; match_count: number; latest_played_at: string }>).map((row) => ({
      dayKey: row.day_key,
      matchCount: Number(row.match_count),
      latestPlayedAt: row.latest_played_at,
    }));
  }

  const { data: playedAtRows, error: fallbackError } = await supabase
    .from('matches')
    .select('played_at')
    .eq('group_id', groupId)
    .order('played_at', { ascending: false });

  if (fallbackError) throw fallbackError;

  return groupPlayedAtByDay((playedAtRows || []).map((row) => row.played_at as string));
}

export function groupPlayedAtByDay(
  playedAtValues: string[],
  boundaryHour = ARENA_DAY_BOUNDARY_HOUR,
): ArenaDaySummary[] {
  const groups = new Map<string, { count: number; latest: string }>();

  playedAtValues.forEach((playedAt) => {
    const dayKey = getArenaDayKey(playedAt, boundaryHour);
    const current = groups.get(dayKey) || { count: 0, latest: playedAt };
    current.count += 1;
    if (playedAt > current.latest) current.latest = playedAt;
    groups.set(dayKey, current);
  });

  return Array.from(groups.entries())
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([dayKey, value]) => ({
      dayKey,
      matchCount: value.count,
      latestPlayedAt: value.latest,
    }));
}