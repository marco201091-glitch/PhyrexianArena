import { apiGet } from '@/lib/api';
import type { EdhrecCommanderStats } from '@/lib/edhrec';

const cache = new Map<string, EdhrecCommanderStats | null>();
const inflight = new Map<string, Promise<EdhrecCommanderStats | null>>();

export function normalizeEdhrecCommander(commander: string) {
  return commander.trim().toLowerCase();
}

export function getCachedEdhrecStats(normalized: string) {
  if (!cache.has(normalized)) return undefined;
  return cache.get(normalized) ?? null;
}

export async function fetchEdhrecStats(commander: string): Promise<EdhrecCommanderStats | null> {
  const normalized = normalizeEdhrecCommander(commander);
  if (normalized.length < 2) return null;

  if (cache.has(normalized)) {
    return cache.get(normalized) ?? null;
  }

  const existing = inflight.get(normalized);
  if (existing) return existing;

  const request = apiGet<{ data?: EdhrecCommanderStats | null }>(
    `/api/edhrec-commander?commander=${encodeURIComponent(commander.trim())}`,
  )
    .then(({ data, status }) => {
      const stats = status < 400 ? (data?.data ?? null) : null;
      cache.set(normalized, stats);
      inflight.delete(normalized);
      return stats;
    })
    .catch(() => {
      cache.set(normalized, null);
      inflight.delete(normalized);
      return null;
    });

  inflight.set(normalized, request);
  return request;
}

export function prefetchEdhrecStats(commander: string) {
  return fetchEdhrecStats(commander);
}