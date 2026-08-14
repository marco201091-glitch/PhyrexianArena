import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { applyIpRateLimit } from '@/app/api/_lib/with-rate-limit';
import type { ArenaAnalyticsBundlePayload } from '@/lib/arena-analytics-bundle';
import { getArenaSeasonPeriod } from '@/lib/arena-seasons';
import { buildPublicArenaAnalytics } from '@/lib/public-arena-analytics';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function unwrapRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  const rateLimited = await applyIpRateLimit(request, 'publicArena');
  if (rateLimited) return rateLimited;

  const { code } = await context.params;
  const supabase = getServiceClient();

  if (!supabase) {
    return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 });
  }

  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('id, name, description, invite_code, is_public, created_at, seasons_enabled, season_reset_month')
    .eq('invite_code', code.toUpperCase())
    .maybeSingle();

  if (groupError || !group || !group.is_public) {
    return NextResponse.json({ error: 'Public playgroup not found' }, { status: 404 });
  }

  const seasonEnabled = group.seasons_enabled ?? true;
  const season = seasonEnabled ? getArenaSeasonPeriod(group.season_reset_month ?? 1) : null;

  const analyticsRequest = supabase.rpc('get_public_arena_analytics_bundle', {
    p_group_id: group.id,
    p_since: season ? `${season.start}T00:00:00.000Z` : null,
    p_until: season ? `${season.end}T00:00:00.000Z` : null,
  });

  let recentMatchesQuery = supabase
    .from('matches')
    .select(`
      id,
      played_at,
      notes,
      winner_id,
      winner_guest_id,
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
        decks (name, commander, commander_image, bracket, color_identity, owner:profiles!decks_user_id_fkey (username, display_name)),
        arena_guest_decks (name, commander, commander_image, bracket, color_identity)
      )
    `)
    .eq('group_id', group.id);

  if (season) {
    recentMatchesQuery = recentMatchesQuery
      .gte('played_at', `${season.start}T00:00:00.000Z`)
      .lt('played_at', `${season.end}T00:00:00.000Z`);
  }

  const [analyticsResult, matchesResult] = await Promise.all([
    analyticsRequest,
    recentMatchesQuery
      .order('played_at', { ascending: false })
      .limit(10),
  ]);

  if (analyticsResult.error || matchesResult.error) {
    return NextResponse.json({ error: 'Failed to load arena stats' }, { status: 500 });
  }

  const matches = matchesResult.data || [];
  const publicAnalytics = buildPublicArenaAnalytics(
    (analyticsResult.data || {}) as ArenaAnalyticsBundlePayload,
  );

  return NextResponse.json({
    arena: {
      name: group.name,
      description: group.description,
      inviteCode: group.invite_code,
      createdAt: group.created_at,
      seasonsEnabled: seasonEnabled,
      seasonStart: season?.start ?? null,
      seasonEnd: season?.end ?? null,
    },
    ...publicAnalytics,
    recentMatches: matches.map((match) => ({
      id: match.id,
      playedAt: match.played_at,
      notes: match.notes,
      winnerName: unwrapRelation(match.winner_guest)?.display_name
        || unwrapRelation(match.winner)?.display_name?.trim()
        || unwrapRelation(match.winner)?.username
        || '—',
      participants: (match.match_participants || []).map((participant) => {
        const deck = unwrapRelation(participant.decks) || unwrapRelation(participant.arena_guest_decks);
        const guestProfile = unwrapRelation(participant.arena_guests);
        const userProfile = unwrapRelation(participant.profiles);
        return {
          displayName: guestProfile?.display_name
            || userProfile?.display_name?.trim()
            || userProfile?.username
            || 'Player',
          commander: deck?.commander || null,
          deckName: deck?.name || null,
          isWinner: participant.is_winner,
          bracket: deck?.bracket || null,
        };
      }),
    })),
  });
}
