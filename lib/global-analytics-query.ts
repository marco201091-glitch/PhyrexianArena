import { deckHasColorIdentity, getDeckDisplayColors } from '@/lib/deck-metadata';
import { syncDeckCommanderColors } from '@/lib/deck-color-sync';
import {
  buildPersonalAnalytics,
  type PersonalAnalytics,
} from '@/lib/personal-analytics';
import { fetchGlobalAnalyticsInputs } from '@/lib/personal-analytics-query';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

export async function fetchGlobalAnalyticsForAdmin(): Promise<PersonalAnalytics> {
  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    throw new Error('Service role is not configured.');
  }

  const { participants, decksById } = await fetchGlobalAnalyticsInputs(adminClient);

  const colorOverrides = new Map<string, string[]>();
  decksById.forEach((deck, deckId) => {
    const colors = getDeckDisplayColors(deck);
    if (colors.length > 0) {
      colorOverrides.set(deckId, colors);
    }
  });

  const decksMissingColors = Array.from(decksById.values()).filter(
    (deck) => !deckHasColorIdentity(deck) && Boolean(deck.commander?.trim()),
  );

  if (decksMissingColors.length > 0) {
    const resolved = await syncDeckCommanderColors(
      decksMissingColors.map((deck) => ({
        id: deck.id,
        commander: deck.commander,
        source_type: deck.source_type,
        source_url: deck.source_url,
        color_identity: deck.color_identity,
      })),
      Object.fromEntries(colorOverrides),
      5,
    );

    resolved.forEach((colors, deckId) => {
      if (colors.length > 0) {
        colorOverrides.set(deckId, colors);
      }
    });
  }

  return buildPersonalAnalytics(participants, decksById, colorOverrides);
}
