import { useEffect, useRef, useState } from 'react';
import { apiGet } from '@/lib/api';
import type { CommanderPartnerMode, CommanderSearchResult } from '@/lib/commander-types';
import { searchCommandersDirect } from '@/lib/scryfall-search';
import AsyncStorage from '@react-native-async-storage/async-storage';

const COMMANDER_SEARCH_CACHE_MS = 7 * 24 * 60 * 60 * 1_000;
const COMMANDER_SEARCH_CACHE_LIMIT = 1_000;
const COMMANDER_SEARCH_STORAGE_KEY = 'phyrexian-arena:commander-search:v7';
const commanderSearchCache = new Map<string, { expiresAt: number; results: CommanderSearchResult[] }>();
let searchHydratePromise: Promise<void> | null = null;

function hydrateCommanderSearchCache() {
  if (searchHydratePromise) return searchHydratePromise;
  searchHydratePromise = AsyncStorage.getItem(COMMANDER_SEARCH_STORAGE_KEY)
    .then((raw) => {
      if (!raw) return;
      const stored = JSON.parse(raw) as Record<string, { expiresAt: number; results: CommanderSearchResult[] }>;
      const now = Date.now();
      Object.entries(stored).forEach(([key, entry]) => {
        if (entry.expiresAt > now && Array.isArray(entry.results)) commanderSearchCache.set(key, entry);
      });
    })
    .catch(() => undefined);
  return searchHydratePromise;
}

function rememberCommanderSearch(cacheKey: string, results: CommanderSearchResult[]) {
  if (commanderSearchCache.size >= COMMANDER_SEARCH_CACHE_LIMIT) {
    const oldestKey = commanderSearchCache.keys().next().value;
    if (oldestKey) commanderSearchCache.delete(oldestKey);
  }
  commanderSearchCache.set(cacheKey, {
    expiresAt: Date.now() + COMMANDER_SEARCH_CACHE_MS,
    results,
  });
  void AsyncStorage.setItem(
    COMMANDER_SEARCH_STORAGE_KEY,
    JSON.stringify(Object.fromEntries(commanderSearchCache)),
  ).catch(() => undefined);
}

function searchCacheKey(value: string, mode: CommanderPartnerMode | null) {
  return `${mode ?? 'any'}:${value.trim().toLocaleLowerCase()}`;
}

async function fetchCommanderSearchResults(
  value: string,
  mode: CommanderPartnerMode | null,
  signal?: AbortSignal,
): Promise<CommanderSearchResult[]> {
  const trimmed = value.trim();
  if (trimmed.length < 2) return [];
  await hydrateCommanderSearchCache();
  const cacheKey = searchCacheKey(trimmed, mode);
  const cached = commanderSearchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.results;

  try {
    const params = new URLSearchParams({ q: trimmed });
    if (mode) params.set('partnerMode', mode);
    const { data, status } = await apiGet<{ data?: CommanderSearchResult[]; error?: string }>(
      `/api/scryfall-commanders?${params.toString()}`,
      { signal, timeoutMs: 4_000 },
    );
    const results = Array.isArray(data?.data) ? data.data : [];
    if (status === 200 && results.length > 0) {
      rememberCommanderSearch(cacheKey, results);
      return results;
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }
  }

  const results = await searchCommandersDirect(trimmed, mode, signal).catch(() => []);
  rememberCommanderSearch(cacheKey, results);
  return results;
}

export function useCommanderSearch(query: string, partnerMode?: CommanderPartnerMode | null) {
  const [results, setResults] = useState<CommanderSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const controller = new AbortController();

    const cached = commanderSearchCache.get(searchCacheKey(trimmed, partnerMode ?? null));
    if (cached && cached.expiresAt > Date.now()) {
      setResults(cached.results);
      setSearching(false);
      return;
    }
    setSearching(true);

    const timer = setTimeout(() => {
      void (async () => {
        try {
          const nextResults = await fetchCommanderSearchResults(
            trimmed,
            partnerMode ?? null,
            controller.signal,
          );
          if (requestIdRef.current !== requestId) return;
          setResults(nextResults);
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') return;
          if (requestIdRef.current !== requestId) return;
          setResults([]);
        } finally {
          if (requestIdRef.current === requestId) {
            setSearching(false);
          }
        }
      })();
    }, 180);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, partnerMode]);

  return { results, searching };
}
