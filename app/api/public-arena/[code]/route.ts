import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { computeArenaColorAnalytics, type ArenaColorMatch } from '@/lib/arena-color-analytics';
import { getDeckDisplayColors } from '@/lib/deck-metadata';
import { MANA_COLOR_LABELS } from '@/lib/mana-colors';

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
  _request: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  const { code } = await context.params;
  const supabase = getServiceClient();

  if (!supabase) {
    return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 });
  }

  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('id, name, description, invite_code, is_public, created_at')
    .eq('invite_code', code.toUpperCase())
    .maybeSingle();

  if (groupError || !group || !group.is_public) {
    return NextResponse.json({ error: 'Public arena not found' }, { status: 404 });
  }

  const { data: matches, error: matchesError } = await supabase
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
        decks (name, commander, commander_image, bracket, color_identity),
        arena_guest_decks (name, commander, commander_image, bracket, color_identity)
      )
    `)
    .eq('group_id', group.id)
    .order('played_at', { ascending: false });

  if (matchesError) {
    return NextResponse.json({ error: 'Failed to load arena stats' }, { status: 500 });
  }

  const playerMap = new Map<string, { displayName: string; gamesPlayed: number; wins: number }>();
  const deckMap = new Map<string, {
    commander: string;
    commanderImage: string | null;
    bracket: string | null;
    gamesPlayed: number;
    wins: number;
  }>();
  const colorOverrides = new Map<string, string[]>();

  (matches || []).forEach((match) => {
    match.match_participants?.forEach((participant) => {
      const isGuest = Boolean(participant.guest_id);
      const playerKey = isGuest
        ? `guest:${participant.guest_id}`
        : `user:${participant.user_id}`;
      const guestProfile = unwrapRelation(participant.arena_guests);
      const userProfile = unwrapRelation(participant.profiles);
      const displayName = isGuest
        ? guestProfile?.display_name || 'Guest'
        : userProfile?.display_name?.trim() || userProfile?.username || 'Player';

      const playerStats = playerMap.get(playerKey) || { displayName, gamesPlayed: 0, wins: 0 };
      playerStats.gamesPlayed += 1;
      if (participant.is_winner) playerStats.wins += 1;
      playerMap.set(playerKey, playerStats);

      const deckRecord = unwrapRelation(participant.decks) || unwrapRelation(participant.arena_guest_decks);
      const deckId = participant.deck_id || participant.guest_deck_id;
      if (deckRecord && deckId) {
        const deckKey = `${deckRecord.commander}::${deckRecord.bracket || 'none'}`;
        const deckStats = deckMap.get(deckKey) || {
          commander: deckRecord.commander,
          commanderImage: deckRecord.commander_image || null,
          bracket: deckRecord.bracket,
          gamesPlayed: 0,
          wins: 0,
        };
        if (!deckStats.commanderImage && deckRecord.commander_image) {
          deckStats.commanderImage = deckRecord.commander_image;
        }
        deckStats.gamesPlayed += 1;
        if (participant.is_winner) deckStats.wins += 1;
        deckMap.set(deckKey, deckStats);

        const colors = getDeckDisplayColors({
          color_identity: deckRecord.color_identity,
          commander_options: null,
        });
        if (colors.length > 0) colorOverrides.set(deckId, colors);
      }
    });
  });

  const topPlayers = Array.from(playerMap.values())
    .map((entry) => ({
      ...entry,
      winRate: entry.gamesPlayed > 0 ? Math.round((entry.wins / entry.gamesPlayed) * 100) : 0,
    }))
    .sort((a, b) => b.winRate - a.winRate || b.wins - a.wins)
    .slice(0, 10);

  const topDecks = Array.from(deckMap.values())
    .map((entry) => ({
      ...entry,
      winRate: entry.gamesPlayed > 0 ? Math.round((entry.wins / entry.gamesPlayed) * 100) : 0,
    }))
    .sort((a, b) => b.winRate - a.winRate || b.wins - a.wins)
    .slice(0, 10);

  const colorMatches: ArenaColorMatch[] = (matches || []).map((match) => ({
    match_participants: (match.match_participants || []).map((participant) => ({
      deck_id: participant.deck_id,
      guest_deck_id: participant.guest_deck_id,
      is_winner: participant.is_winner,
      decks: unwrapRelation(participant.decks),
      arena_guest_decks: unwrapRelation(participant.arena_guest_decks),
    })),
  }));

  const colorAnalytics = computeArenaColorAnalytics(colorMatches, colorOverrides, 'all');

  return NextResponse.json({
    arena: {
      name: group.name,
      description: group.description,
      inviteCode: group.invite_code,
      createdAt: group.created_at,
    },
    summary: {
      totalMatches: matches?.length || 0,
      totalPlayers: playerMap.size,
    },
    topPlayers,
    topDecks,
    topColors: colorAnalytics.played.slice(0, 6).map((entry) => ({
      color: entry.color,
      label: MANA_COLOR_LABELS[entry.color],
      gamesPlayed: entry.appearances,
      percentage: entry.percentage,
      winRate: entry.winRate,
    })),
    colorMeta: colorAnalytics,
    recentMatches: (matches || []).slice(0, 10).map((match) => ({
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