import { apiGet } from '@/lib/api';
import type { CommanderArtOption } from '@/lib/commander-types';
import { fetchCommanderArtOptionsDirect } from '@/lib/scryfall-search';

const ART_OPTIONS_CACHE_MS = 10 * 60 * 1_000;
const artOptionsCache = new Map<string, { expiresAt: number; options: CommanderArtOption[] }>();

export async function fetchCommanderArtOptions(
  commanderName: string,
  signal?: AbortSignal,
): Promise<CommanderArtOption[]> {
  const trimmed = commanderName.trim();
  if (trimmed.length < 2) return [];
  const cacheKey = trimmed.toLocaleLowerCase();
  const cached = artOptionsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.options;

  try {
    const directResults = await fetchCommanderArtOptionsDirect(trimmed, signal);
    if (directResults.length > 0) {
      artOptionsCache.set(cacheKey, {
        expiresAt: Date.now() + ART_OPTIONS_CACHE_MS,
        options: directResults,
      });
      return directResults;
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }
  }

  const params = new URLSearchParams({ name: trimmed });
  const { data, status } = await apiGet<{ data?: CommanderArtOption[]; error?: string }>(
    `/api/scryfall-card-arts?${params.toString()}`,
    { signal, timeoutMs: 10_000 },
  );

  if (status !== 200) return [];
  const options = Array.isArray(data?.data) ? data.data : [];
  if (options.length > 0) {
    artOptionsCache.set(cacheKey, {
      expiresAt: Date.now() + ART_OPTIONS_CACHE_MS,
      options,
    });
  }
  return options;
}
