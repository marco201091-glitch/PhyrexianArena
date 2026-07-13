import type { SupabaseClient } from '@supabase/supabase-js';
import type { ArenaGuest } from '@/lib/arena-participants';
import {
  buildPairedCommanderColorFields,
  buildPairedCommanderName,
} from '@/lib/commander-partners';
import type { CommanderSearchResult } from '@/lib/commander-types';
import { normalizeGuestName } from '@/lib/participant-keys';

type GuestDeckInput = {
  groupId: string;
  commander: CommanderSearchResult;
  partnerCommander?: CommanderSearchResult | null;
  deckName?: string;
  selectedArtUrl?: string | null;
};

async function insertGuestDeck(
  supabase: SupabaseClient,
  guestId: string,
  input: GuestDeckInput,
) {
  const commanderDisplayName = buildPairedCommanderName(input.commander, input.partnerCommander);
  const colorFields = buildPairedCommanderColorFields(input.commander, input.partnerCommander);
  const commanderImage = input.selectedArtUrl ?? input.commander.imageUrl;

  const { data: createdDeck, error: deckError } = await supabase
    .from('arena_guest_decks')
    .insert({
      guest_id: guestId,
      group_id: input.groupId,
      name: input.deckName?.trim() || commanderDisplayName,
      commander: commanderDisplayName,
      commander_image: commanderImage,
      ...colorFields,
      bracket: null,
    })
    .select('id, guest_id, group_id, name, commander, commander_image, color_identity, bracket, created_at')
    .single();

  if (deckError) throw deckError;

  await supabase
    .from('arena_guests')
    .update({ last_played_at: new Date().toISOString() })
    .eq('id', guestId);

  return createdDeck;
}

export async function createGuestWithDeck(
  supabase: SupabaseClient,
  input: {
    groupId: string;
    displayName: string;
    commander: CommanderSearchResult;
    partnerCommander?: CommanderSearchResult | null;
    deckName?: string;
    selectedArtUrl?: string | null;
    existingGuests: ArenaGuest[];
  },
) {
  const normalized = normalizeGuestName(input.displayName);
  if (!normalized) {
    throw new Error('Guest name is required');
  }

  let guest = input.existingGuests.find(
    (entry) => normalizeGuestName(entry.display_name) === normalized,
  ) || null;

  if (!guest) {
    const { data: createdGuest, error: guestError } = await supabase
      .from('arena_guests')
      .insert({
        group_id: input.groupId,
        display_name: input.displayName.trim(),
        normalized_name: normalized,
      })
      .select('id, group_id, display_name, last_played_at')
      .single();

    if (guestError) throw guestError;
    guest = { ...createdGuest, arena_guest_decks: [] } as ArenaGuest;
  }

  const deck = await insertGuestDeck(supabase, guest.id, {
    groupId: input.groupId,
    commander: input.commander,
    partnerCommander: input.partnerCommander,
    deckName: input.deckName,
    selectedArtUrl: input.selectedArtUrl,
  });

  return { guest, deck };
}

export async function addDeckToGuest(
  supabase: SupabaseClient,
  input: GuestDeckInput & { guestId: string },
) {
  const deck = await insertGuestDeck(supabase, input.guestId, input);
  return deck;
}