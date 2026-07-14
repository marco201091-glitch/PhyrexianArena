import { useEffect, useRef, useState } from 'react';
import { apiGet } from '@/lib/api';
import type { CommanderPartnerMode, CommanderSearchResult } from '@/lib/commander-types';
import { searchCommandersDirect } from '@/lib/scryfall-search';

async function fetchCommanderSearchResults(
  value: string,
  mode: CommanderPartnerMode | null,
  signal?: AbortSignal,
): Promise<CommanderSearchResult[]> {
  const trimmed = value.trim();
  if (trimmed.length < 2) return [];

  try {
    const directResults = await searchCommandersDirect(trimmed, mode, signal);
    if (directResults.length > 0) {
      return directResults;
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }
  }

  const params = new URLSearchParams({ q: trimmed });
  if (mode) params.set('partnerMode', mode);
  const { data, status } = await apiGet<{ data?: CommanderSearchResult[]; error?: string }>(
    `/api/scryfall-commanders?${params.toString()}`,
  );

  if (status !== 200) return [];
  return Array.isArray(data?.data) ? data.data : [];
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
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, partnerMode]);

  return { results, searching };
}