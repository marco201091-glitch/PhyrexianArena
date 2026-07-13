import { useCallback, useEffect, useState } from 'react';
import { fetchEdhrecStats, getCachedEdhrecStats, normalizeEdhrecCommander } from '@/lib/edhrec-client';
import type { EdhrecCommanderStats } from '@/lib/edhrec';

export function useEdhrecStats(commander: string, enabled = true) {
  const normalized = normalizeEdhrecCommander(commander);
  const [stats, setStats] = useState<EdhrecCommanderStats | null | undefined>(
    enabled && normalized.length >= 2 && getCachedEdhrecStats(normalized) !== undefined
      ? getCachedEdhrecStats(normalized) ?? null
      : undefined,
  );

  const refresh = useCallback(async () => {
    if (!enabled || normalized.length < 2) return null;
    const next = await fetchEdhrecStats(commander);
    setStats(next);
    return next;
  }, [commander, enabled, normalized]);

  useEffect(() => {
    if (!enabled || normalized.length < 2) {
      setStats(undefined);
      return;
    }

    if (getCachedEdhrecStats(normalized) !== undefined) {
      setStats(getCachedEdhrecStats(normalized) ?? null);
      return;
    }

    let cancelled = false;
    void fetchEdhrecStats(commander).then((next) => {
      if (!cancelled) setStats(next);
    });

    return () => {
      cancelled = true;
    };
  }, [commander, enabled, normalized]);

  return { stats, refresh };
}