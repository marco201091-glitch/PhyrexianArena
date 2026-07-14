import { deckHasColorIdentity, getDeckDisplayColors } from '@/lib/deck-metadata';
import { syncDeckCommanderColors } from '@/lib/deck-color-sync';
import {
  buildPersonalAnalytics,
  emptyPersonalAnalytics,
  type PersonalAnalytics,
  type PersonalDeckSnapshot,
  type PersonalMatchParticipantRow,
} from '@/lib/personal-analytics';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

async function getExcludedUserIds(adminClient: NonNullable<ReturnType<typeof getSupabaseAdminClient>>) {
  const { data, error } = await adminClient.rpc('get_analytics_excluded_user_ids');

  if (error) {
    throw new Error(error.message);
  }

  return new Set((data as string[] | null) ?? []);
}

export async function fetchGlobalAnalyticsForAdmin(): Promise<PersonalAnalytics> {
  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    throw new Error('Service role is not configured.');
  }

  const excludedUserIds = await getExcludedUserIds(adminClient);

  const { data: participantRows, error: participantsError } = await adminClient
    .from('match_participants')
    .select('is_winner, deck_id, user_id')
    .not('deck_id', 'is', null);

  if (participantsError) {
    throw new Error(participantsError.message);
  }

  const participants = ((participantRows as Array<PersonalMatchParticipantRow & { user_id: string | null }>) || [])
    .filter((row) => row.user_id && !excludedUserIds.has(row.user_id))
    .map((row) => ({
      is_winner: row.is_winner,
      deck_id: row.deck_id,
    }));

  const deckIds = Array.from(new Set(participants.map((row) => row.deck_id).filter(Boolean)));

  if (deckIds.length === 0) {
    return emptyPersonalAnalytics();
  }

  const { data: deckRows, error: decksError } = await adminClient
    .from('decks')
    .select('id, name, commander, commander_image, color_identity, bracket, source_type, source_url, profiles:user_id (username)')
    .in('id', deckIds);

  if (decksError) {
    throw new Error(decksError.message);
  }

  const decksById = new Map<string, PersonalDeckSnapshot>(
    (deckRows || []).map((deck) => {
      const profile = Array.isArray(deck.profiles) ? deck.profiles[0] : deck.profiles;

      return [
        deck.id,
        {
          id: deck.id,
          name: deck.name,
          commander: deck.commander,
          commander_image: deck.commander_image,
          color_identity: deck.color_identity,
          source_type: deck.source_type,
          source_url: deck.source_url,
          ownerUsername: profile?.username ?? null,
        },
      ];
    }),
  );

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