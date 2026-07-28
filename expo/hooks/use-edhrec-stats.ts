import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchEdhrecStats, getCachedEdhrecStats, normalizeEdhrecCommander } from '@/lib/edhrec-client';
import type { EdhrecCommanderStats } from '@/lib/edhrec';

export function useEdhrecStats(commander: string, enabled = true) {
  const normalized = normalizeEdhrecCommander(commander);
  const cachedStats = getCachedEdhrecStats(normalized);
  const query = useQuery<EdhrecCommanderStats | null>({
    queryKey: ['edhrec-stats', normalized],
    enabled: enabled && normalized.length >= 2,
    staleTime: 6 * 60 * 60_000,
    initialData: cachedStats,
    queryFn: () => fetchEdhrecStats(commander),
  });

  const refresh = useCallback(async () => {
    if (!enabled || normalized.length < 2) return null;
    const result = await query.refetch();
    return result.data ?? null;
  }, [enabled, normalized, query]);

  return {
    stats: enabled && normalized.length >= 2 ? query.data : undefined,
    refresh,
  };
}
