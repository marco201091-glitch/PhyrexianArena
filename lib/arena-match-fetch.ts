import { getDayPlayedAtRange } from '@/lib/arena-day-fetch';
import type { SupabaseClient } from '@supabase/supabase-js';

export const MATCHES_SELECT = `
  *,
  winner:winner_id (id, username, display_name),
  winner_guest:arena_guests!matches_winner_guest_id_fkey (id, display_name),
  match_participants (
    id,
    user_id,
    guest_id,
    deck_id,
    guest_deck_id,
    is_winner,
    profiles (id, username, display_name),
    arena_guests (id, display_name),
    decks (name, commander, commander_image, bracket, color_identity, source_type),
    arena_guest_decks (name, commander, commander_image, bracket, color_identity)
  )
`;

export async function fetchMatchesForDay(
  supabase: SupabaseClient,
  groupId: string,
  dayKey: string,
) {
  const { start, end } = getDayPlayedAtRange(dayKey);

  const { data, error } = await supabase
    .from('matches')
    .select(MATCHES_SELECT)
    .eq('group_id', groupId)
    .gte('played_at', start.toISOString())
    .lt('played_at', end.toISOString())
    .order('played_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function fetchLatestDayMatches(
  supabase: SupabaseClient,
  groupId: string,
  latestDayKey: string | null,
) {
  if (!latestDayKey) return [];
  return fetchMatchesForDay(supabase, groupId, latestDayKey);
}

export async function fetchMatchesSince(
  supabase: SupabaseClient,
  groupId: string,
  since: Date,
) {
  const { data, error } = await supabase
    .from('matches')
    .select(MATCHES_SELECT)
    .eq('group_id', groupId)
    .gte('played_at', since.toISOString())
    .order('played_at', { ascending: false });

  if (error) throw error;
  return data || [];
}