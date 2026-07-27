import { useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDeckDisplayColors } from '@/lib/deck-metadata';
import {
  buildPersonalAnalytics,
  emptyPersonalAnalytics,
  type PersonalAnalytics,
} from '@/lib/personal-analytics';
import { fetchPersonalAnalyticsInputs } from '@/lib/personal-analytics-query';
import { prefetchCommanderNames, prefetchDeckImageUrls } from '@/lib/deck-image-cache';
import { getSupabaseErrorMessage } from '@/lib/supabase-errors';
import { supabase } from '@/lib/supabase';

export function usePersonalAnalytics(userId: string | undefined) {
  const analyticsQuery = useQuery({
    queryKey: ['personal-analytics', userId],
    enabled: Boolean(userId),
    staleTime: 60_000,
    queryFn: async (): Promise<PersonalAnalytics> => {
      const { participants, decksById } = await fetchPersonalAnalyticsInputs(supabase, userId!);
      if (decksById.size === 0) {
        return emptyPersonalAnalytics();
      }

      const colorOverrides = new Map<string, string[]>();
      decksById.forEach((deck, deckId) => {
        const colors = getDeckDisplayColors(deck);
        if (colors.length > 0) {
          colorOverrides.set(deckId, colors);
        }
      });

      const analyticsResult = buildPersonalAnalytics(participants, decksById, colorOverrides);
      void prefetchDeckImageUrls([
        ...analyticsResult.topDecks.map((deck) => deck.commanderImage),
        analyticsResult.bestDeck?.commanderImage,
        ...Array.from(decksById.values()).map((deck) => deck.commander_image),
      ], { background: true });
      void prefetchCommanderNames([
        ...analyticsResult.topDecks.map((deck) => deck.commander),
        analyticsResult.bestDeck?.commander,
        ...Array.from(decksById.values()).map((deck) => deck.commander),
      ], { background: true });
      return analyticsResult;
    },
  });

  useEffect(() => {
    if (analyticsQuery.error) {
      console.error(
        'Error fetching personal analytics:',
        getSupabaseErrorMessage(analyticsQuery.error, 'Failed to fetch personal analytics'),
      );
    }
  }, [analyticsQuery.error]);

  const refresh = useCallback(async () => {
    if (!userId) return;
    await analyticsQuery.refetch();
  }, [analyticsQuery, userId]);

  return {
    analytics: analyticsQuery.data ?? null,
    loading: Boolean(userId) && analyticsQuery.isPending,
    refresh,
  };
}
