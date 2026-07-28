import { useQuery } from '@tanstack/react-query';
import { fetchCommanderArtOptions } from '@/lib/commander-arts';
import { prefetchCommanderArtsByName, prefetchDeckImageUrls } from '@/lib/deck-image-cache';

export function useCommanderArts(commanderName: string | null | undefined) {
  const trimmed = commanderName?.trim() || '';
  const query = useQuery({
    queryKey: ['commander-arts', trimmed.toLocaleLowerCase()],
    enabled: trimmed.length >= 2,
    staleTime: 24 * 60 * 60_000,
    queryFn: async ({ signal }) => {
      const nextArts = await fetchCommanderArtOptions(trimmed, signal);
      void prefetchDeckImageUrls(nextArts.map((art) => art.imageUrl), { background: true });
      void prefetchCommanderArtsByName(trimmed, { background: true });
      return nextArts;
    },
  });

  return {
    arts: trimmed.length >= 2 ? query.data ?? [] : [],
    loading: trimmed.length >= 2 && query.isFetching,
  };
}
