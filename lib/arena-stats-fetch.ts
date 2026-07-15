import { computeArenaColorAnalytics, type ArenaColorMatch } from '@/lib/arena-color-analytics';
import { getParticipantKey, type MatchParticipantRecord } from '@/lib/arena-participants';
import type { ParticipantKey } from '@/lib/participant-keys';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface ArenaStatsParticipantRow {
  match_id: string;
  played_at: string;
  is_draw: boolean;
  user_id: string | null;
  guest_id: string | null;
  deck_id: string | null;
  guest_deck_id: string | null;
  is_winner: boolean;
  username: string | null;
  display_name: string | null;
  guest_display_name: string | null;
  deck_commander: string | null;
  deck_commander_image: string | null;
  deck_bracket: string | null;
  deck_color_identity: string[] | null;
  guest_deck_commander: string | null;
  guest_deck_commander_image: string | null;
  guest_deck_bracket: string | null;
  guest_deck_color_identity: string[] | null;
}

export interface PlayerStatsRow {
  key: ParticipantKey;
  displayName: string;
  isGuest: boolean;
  profile: {
    id: string;
    username: string;
    display_name: string | null;
  } | null;
  gamesPlayed: number;
  wins: number;
  winRate: number;
}

export interface CommanderStatsRow {
  key: string;
  commander: string;
  commanderImageUrl: string | null;
  bracket: string | null;
  gamesPlayed: number;
  wins: number;
  winRate: number;
}

function rowToParticipant(row: ArenaStatsParticipantRow): MatchParticipantRecord {
  const hasGuest = Boolean(row.guest_id);
  return {
    id: `${row.match_id}:${row.user_id || row.guest_id}`,
    user_id: row.user_id,
    guest_id: row.guest_id,
    deck_id: row.deck_id,
    guest_deck_id: row.guest_deck_id,
    is_winner: row.is_winner,
    profiles: hasGuest || !row.user_id
      ? null
      : {
          id: row.user_id!,
          username: row.username || 'player',
          display_name: row.display_name,
        },
    arena_guests: hasGuest
      ? { id: row.guest_id!, display_name: row.guest_display_name || 'Guest' }
      : null,
    decks: row.deck_id
      ? {
          name: row.deck_commander || 'Deck',
          commander: row.deck_commander || 'Unknown',
          commander_image: row.deck_commander_image,
          bracket: row.deck_bracket,
          color_identity: row.deck_color_identity,
          source_type: null,
        }
      : null,
    arena_guest_decks: row.guest_deck_id
      ? {
          name: row.guest_deck_commander || 'Deck',
          commander: row.guest_deck_commander || 'Unknown',
          commander_image: row.guest_deck_commander_image,
          bracket: row.guest_deck_bracket,
          color_identity: row.guest_deck_color_identity,
        }
      : null,
  };
}

export async function fetchArenaStatsParticipants(
  supabase: SupabaseClient,
  groupId: string,
  since?: Date | null,
): Promise<ArenaStatsParticipantRow[]> {
  const { data, error } = await supabase.rpc('get_arena_stats_participants', {
    p_group_id: groupId,
    p_since: since ? since.toISOString() : null,
  });

  if (error) {
    const { data: fallback, error: fallbackError } = await supabase
      .from('match_participants')
      .select(`
        match_id,
        user_id,
        guest_id,
        deck_id,
        guest_deck_id,
        is_winner,
        profiles (username, display_name),
        arena_guests (display_name),
        decks (commander, commander_image, bracket, color_identity),
        arena_guest_decks (commander, commander_image, bracket, color_identity),
        matches!inner (group_id, played_at, is_draw)
      `)
      .eq('matches.group_id', groupId);

    if (fallbackError) throw fallbackError;

    const sinceMs = since ? since.getTime() : null;
    return (fallback || [])
      .filter((row) => {
        const match = row.matches as unknown as { played_at?: string } | null;
        const playedAt = match?.played_at;
        if (!playedAt) return false;
        if (sinceMs === null) return true;
        return new Date(playedAt).getTime() >= sinceMs;
      })
      .map((row) => {
        const match = row.matches as unknown as { played_at: string; is_draw?: boolean };
        return {
        match_id: row.match_id,
        played_at: match.played_at,
        is_draw: Boolean(match.is_draw),
        user_id: row.user_id,
        guest_id: row.guest_id,
        deck_id: row.deck_id,
        guest_deck_id: row.guest_deck_id,
        is_winner: row.is_winner,
        username: (row.profiles as { username?: string } | null)?.username ?? null,
        display_name: (row.profiles as { display_name?: string | null } | null)?.display_name ?? null,
        guest_display_name: (row.arena_guests as { display_name?: string } | null)?.display_name ?? null,
        deck_commander: (row.decks as { commander?: string } | null)?.commander ?? null,
        deck_commander_image: (row.decks as { commander_image?: string | null } | null)?.commander_image ?? null,
        deck_bracket: (row.decks as { bracket?: string | null } | null)?.bracket ?? null,
        deck_color_identity: (row.decks as { color_identity?: string[] | null } | null)?.color_identity ?? null,
        guest_deck_commander: (row.arena_guest_decks as { commander?: string } | null)?.commander ?? null,
        guest_deck_commander_image: (row.arena_guest_decks as { commander_image?: string | null } | null)?.commander_image ?? null,
        guest_deck_bracket: (row.arena_guest_decks as { bracket?: string | null } | null)?.bracket ?? null,
        guest_deck_color_identity: (row.arena_guest_decks as { color_identity?: string[] | null } | null)?.color_identity ?? null,
      };
      }) as ArenaStatsParticipantRow[];
  }

  return (data || []) as ArenaStatsParticipantRow[];
}

export function buildPlayerStatsFromRows(
  rows: ArenaStatsParticipantRow[],
): PlayerStatsRow[] {
  const map = new Map<ParticipantKey, PlayerStatsRow>();

  rows.forEach((row) => {
    const participant = rowToParticipant(row);
    const key = getParticipantKey(participant);
    if (!key) return;

    if (!map.has(key)) {
      map.set(key, {
        key,
        displayName: row.guest_display_name || row.display_name || row.username || 'Player',
        isGuest: Boolean(row.guest_id),
        profile: row.guest_id || !row.user_id
          ? null
          : {
              id: row.user_id,
              username: row.username || 'player',
              display_name: row.display_name,
            },
        gamesPlayed: 0,
        wins: 0,
        winRate: 0,
      });
    }

    const stats = map.get(key)!;
    stats.gamesPlayed += 1;
    if (row.is_winner) stats.wins += 1;
  });

  return Array.from(map.values())
    .map((entry) => ({
      ...entry,
      winRate: entry.gamesPlayed > 0 ? Math.round((entry.wins / entry.gamesPlayed) * 100) : 0,
    }))
    .sort((a, b) => b.winRate - a.winRate || b.wins - a.wins);
}

export function buildCommanderStatsFromRows(
  rows: ArenaStatsParticipantRow[],
  bracketFilter: string,
  sort: 'winRate' | 'wins' | 'gamesPlayed' = 'winRate',
): CommanderStatsRow[] {
  const map = new Map<string, CommanderStatsRow>();

  rows.forEach((row) => {
    const commander = row.deck_commander || row.guest_deck_commander;
    if (!commander) return;

    const bracket = row.deck_bracket || row.guest_deck_bracket;
    if (bracketFilter !== 'all' && bracket !== bracketFilter) return;

    const key = `${commander}::${bracket || 'none'}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        commander,
        commanderImageUrl: row.deck_commander_image || row.guest_deck_commander_image,
        bracket,
        gamesPlayed: 0,
        wins: 0,
        winRate: 0,
      });
    }

    const stats = map.get(key)!;
    stats.gamesPlayed += 1;
    if (row.is_winner) stats.wins += 1;
  });

  const results = Array.from(map.values()).map((entry) => ({
    ...entry,
    winRate: entry.gamesPlayed > 0 ? Math.round((entry.wins / entry.gamesPlayed) * 100) : 0,
  }));

  return results.sort((a, b) => {
    if (sort === 'gamesPlayed') return b.gamesPlayed - a.gamesPlayed || b.wins - a.wins;
    if (sort === 'wins') return b.wins - a.wins || b.winRate - a.winRate;
    return b.winRate - a.winRate || b.wins - a.wins;
  });
}

export function buildColorAnalyticsFromRows(
  rows: ArenaStatsParticipantRow[],
  colorOverrides: Map<string, string[]>,
  bracketFilter: string,
) {
  const matchesMap = new Map<string, ArenaColorMatch>();

  rows.forEach((row) => {
    const participant = rowToParticipant(row);
    const bracket = row.deck_bracket || row.guest_deck_bracket;
    if (bracketFilter !== 'all' && bracket !== bracketFilter) return;

    const existing = matchesMap.get(row.match_id) || { match_participants: [] };
    existing.match_participants.push(participant);
    matchesMap.set(row.match_id, existing);
  });

  return computeArenaColorAnalytics(
    Array.from(matchesMap.values()),
    colorOverrides,
    bracketFilter,
  );
}

export function extractDeckColorOverridesFromRows(rows: ArenaStatsParticipantRow[]) {
  const overrides: Record<string, string[]> = {};
  rows.forEach((row) => {
    if (row.deck_id && row.deck_color_identity?.length) {
      overrides[row.deck_id] = row.deck_color_identity;
    }
    if (row.guest_deck_id && row.guest_deck_color_identity?.length) {
      overrides[row.guest_deck_id] = row.guest_deck_color_identity;
    }
  });
  return overrides;
}