import { useCallback, useEffect, useState } from 'react';
import { getDeckDisplayColors } from '@/lib/deck-metadata';
import {
  buildPersonalAnalytics,
  emptyPersonalAnalytics,
  type PersonalAnalytics,
  type PersonalDeckSnapshot,
  type PersonalMatchParticipantRow,
} from '@/lib/personal-analytics';
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
      const { data: participantRows, error: participantsError } = await supabase
        .from('match_participants')
        .select('is_winner, deck_id, matches(played_at)')
        .eq('user_id', userId)
        .not('deck_id', 'is', null);

      if (participantsError) throw participantsError;

      const participants = ((participantRows as Array<PersonalMatchParticipantRow & {
        matches?: { played_at: string } | Array<{ played_at: string }> | null;
      }>) || []).map((row) => ({
        is_winner: row.is_winner,
        deck_id: row.deck_id,
        played_at: Array.isArray(row.matches)
          ? row.matches[0]?.played_at ?? null
          : row.matches?.played_at ?? null,
      }));
      const deckIds = Array.from(new Set(participants.map((row) => row.deck_id).filter(Boolean)));

      if (deckIds.length === 0) {
        setAnalytics(emptyPersonalAnalytics());
        return;
      }

      const { data: deckRows, error: decksError } = await supabase
        .from('decks')
        .select('id, name, commander, commander_image, color_identity, bracket, source_type, source_url')
        .in('id', deckIds);

      if (decksError) throw decksError;

      const decksById = new Map<string, PersonalDeckSnapshot>(
        ((deckRows as PersonalDeckSnapshot[]) || []).map((deck) => [deck.id, deck]),
      );

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