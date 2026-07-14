import { useEffect, useState } from 'react';
import { fetchCommanderArtOptions } from '@/lib/commander-arts';
import { prefetchCommanderArtsByName, prefetchDeckImageUrls } from '@/lib/deck-image-cache';

export function useCommanderArts(commanderName: string | null | undefined) {
  const [arts, setArts] = useState<Awaited<ReturnType<typeof fetchCommanderArtOptions>>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmed = commanderName?.trim() || '';
    if (trimmed.length < 2) {
      setArts([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    void (async () => {
      try {
        const nextArts = await fetchCommanderArtOptions(trimmed, controller.signal);
        if (controller.signal.aborted) return;

        setArts(nextArts);
        void prefetchDeckImageUrls(nextArts.map((art) => art.imageUrl), { background: true });
        void prefetchCommanderArtsByName(trimmed, { background: true });
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
        if (!controller.signal.aborted) setArts([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => {
      controller.abort();
    };
  }, [commanderName]);

  return { arts, loading };
}