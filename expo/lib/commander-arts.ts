import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiGet } from '@/lib/api';
import type { CommanderArtOption } from '@/lib/commander-types';
import { fetchCommanderArtOptionsDirect } from '@/lib/scryfall-search';

const ART_OPTIONS_CACHE_MS = 365 * 24 * 60 * 60 * 1_000;
const ART_OPTIONS_EMPTY_CACHE_MS = 6 * 60 * 60 * 1_000;
const ART_OPTIONS_CACHE_LIMIT = 500;
const ART_OPTIONS_STORAGE_KEY = 'phyrexian-arena:commander-art-options:v7';
const artOptionsCache = new Map<string, { expiresAt: number; options: CommanderArtOption[] }>();
const artOptionsInflight = new Map<string, Promise<CommanderArtOption[]>>();
let hydratePromise: Promise<void> | null = null;

function hydrateArtOptionsCache() {
  if (hydratePromise) return hydratePromise;
  hydratePromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(ART_OPTIONS_STORAGE_KEY);
      if (!raw) return;
      const stored = JSON.parse(raw) as Record<string, { expiresAt: number; options: CommanderArtOption[] }>;
      const now = Date.now();
      Object.entries(stored).forEach(([key, entry]) => {
        if (entry.expiresAt > now && Array.isArray(entry.options)) {
          artOptionsCache.set(key, entry);
        }
      });
    } catch {
      // Corrupt or unavailable cache: continue with the network.
    }
  })();
  return hydratePromise;
}

function rememberArtOptions(
  key: string,
  options: CommanderArtOption[],
  ttlMs = options.length > 0 ? ART_OPTIONS_CACHE_MS : ART_OPTIONS_EMPTY_CACHE_MS,
) {
  if (artOptionsCache.size >= ART_OPTIONS_CACHE_LIMIT) {
    const oldestKey = artOptionsCache.keys().next().value;
    if (oldestKey) artOptionsCache.delete(oldestKey);
  }
  artOptionsCache.set(key, { expiresAt: Date.now() + ttlMs, options });
  void AsyncStorage.setItem(
    ART_OPTIONS_STORAGE_KEY,
    JSON.stringify(Object.fromEntries(artOptionsCache)),
  ).catch(() => undefined);
}

export async function fetchCommanderArtOptions(
  commanderName: string,
  signal?: AbortSignal,
): Promise<CommanderArtOption[]> {
  const trimmed = commanderName.trim();
  if (trimmed.length < 2) return [];
  const cacheKey = trimmed.toLocaleLowerCase();
  await hydrateArtOptionsCache();
  const cached = artOptionsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.options;

  const inflight = artOptionsInflight.get(cacheKey);
  if (inflight) return inflight;

  const request = (async () => {
    const params = new URLSearchParams({ name: trimmed });
    try {
      const { data, status } = await apiGet<{ data?: CommanderArtOption[]; error?: string }>(
        `/api/scryfall-card-arts?${params.toString()}`,
        { signal, timeoutMs: 4_000 },
      );
      if (status === 200 && Array.isArray(data?.data) && data.data.length > 0) {
        rememberArtOptions(cacheKey, data.data);
        return data.data;
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }
    }

    const options = await fetchCommanderArtOptionsDirect(trimmed, signal).catch(() => []);
    rememberArtOptions(cacheKey, options);
    return options;
  })();

  artOptionsInflight.set(cacheKey, request);
  try {
    return await request;
  } finally {
    artOptionsInflight.delete(cacheKey);
  }
}
