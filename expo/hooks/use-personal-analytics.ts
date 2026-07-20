import { useCallback, useEffect, useState } from 'react';
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
  const [analytics, setAnalytics] = useState<PersonalAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setAnalytics(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { participants, decksById } = await fetchPersonalAnalyticsInputs(supabase, userId);
      if (decksById.size === 0) {
        setAnalytics(emptyPersonalAnalytics());
        return;
      }

      const colorOverrides = new Map<string, string[]>();
      decksById.forEach((deck, deckId) => {
        const colors = getDeckDisplayColors(deck);
        if (colors.length > 0) {
          colorOverrides.set(deckId, colors);
        }
      });

      const analyticsResult = buildPersonalAnalytics(participants, decksById, colorOverrides);
      setAnalytics(analyticsResult);

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
    } catch (error) {
      console.error(
        'Error fetching personal analytics:',
        getSupabaseErrorMessage(error, 'Failed to fetch personal analytics'),
      );
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { analytics, loading, refresh };
}
