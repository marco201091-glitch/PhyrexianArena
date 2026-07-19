import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getColorIdentityGroupKey,
  getColorIdentityLabel,
  getPlayableManaColors,
  MANA_COLOR_ORDER,
} from '@/lib/mana-colors';
import type { ArenaColorAnalytics } from '@/lib/arena-color-analytics';
import type { DeckPerformanceStats } from '@/lib/deck-performance-analytics';
import type { CommanderStatsRow, PlayerStatsRow } from '@/lib/arena-stats-fetch';

type PlayerRollup = {
  key: string;
  user_id: string | null;
  guest_id: string | null;
  display_name: string;
  is_guest: boolean;
  games_played: number;
  wins: number;
};

type CommanderRollup = {
  commander: string;
  commander_image: string | null;
  bracket: string | null;
  games_played: number;
  wins: number;
};

type ColorRollup = {
  color_identity: string[];
  bracket: string | null;
  appearances: number;
  wins: number;
};

type DeckRollup = {
  key: string;
  deck_id: string;
  is_guest_deck: boolean;
  deck_name: string;
  commander: string;
  commander_image: string | null;
  games_played: number;
  tracked_games: number;
  wins: number;
  second_places: number;
  total_damage_dealt: number;
  total_damage_taken: number;
  total_life_gained: number;
  commander_damage_dealt: number;
  infect_dealt: number;
  eliminations: number;
  group_damage_dealt: number;
  group_damage_events: number;
  median_winning_duration_seconds: number | null;
};

export type ArenaAnalyticsBundlePayload = {
  players?: PlayerRollup[];
  commanders?: CommanderRollup[];
  colors?: ColorRollup[];
  decks?: DeckRollup[];
  totalMatches?: number;
};

export type ArenaAnalyticsBundle = {
  players: PlayerStatsRow[];
  commanders: CommanderStatsRow[];
  colors: ArenaColorAnalytics;
  decks: DeckPerformanceStats[];
  brackets: string[];
};

function percentage(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

export function buildArenaAnalyticsBundle(
  payload: ArenaAnalyticsBundlePayload,
  bracketFilter = 'all',
  commanderSort: 'winRate' | 'gamesPlayed' = 'winRate',
): ArenaAnalyticsBundle {
  const players = (payload.players || []).map<PlayerStatsRow>((row) => ({
    key: row.key as PlayerStatsRow['key'],
    displayName: row.display_name,
    isGuest: row.is_guest,
    profile: row.user_id ? {
      id: row.user_id,
      username: row.display_name,
      display_name: row.display_name,
    } : null,
    gamesPlayed: row.games_played,
    wins: row.wins,
    winRate: percentage(row.wins, row.games_played),
  })).sort((left, right) => right.winRate - left.winRate || right.wins - left.wins);

  const commanders = (payload.commanders || [])
    .filter((row) => bracketFilter === 'all' || row.bracket === bracketFilter)
    .map<CommanderStatsRow>((row) => ({
      key: `${row.commander}::${row.bracket || 'none'}`,
      commander: row.commander,
      commanderImageUrl: row.commander_image,
      bracket: row.bracket,
      gamesPlayed: row.games_played,
      wins: row.wins,
      winRate: percentage(row.wins, row.games_played),
    }))
    .sort((left, right) => commanderSort === 'gamesPlayed'
      ? right.gamesPlayed - left.gamesPlayed || right.wins - left.wins
      : right.winRate - left.winRate || right.wins - left.wins);

  const filteredColors = (payload.colors || []).filter(
    (row) => bracketFilter === 'all' || row.bracket === bracketFilter,
  );
  const colorMap = new Map<string, { appearances: number; wins: number }>(MANA_COLOR_ORDER.map((color) => [
    color,
    { appearances: 0, wins: 0 },
  ]));
  const pairMap = new Map<string, { colors: string[]; appearances: number; wins: number }>();
  let totalColorAppearances = 0;
  filteredColors.forEach((row) => {
    const colors = getPlayableManaColors(row.color_identity || []);
    colors.forEach((color) => {
      const current = colorMap.get(color) || { appearances: 0, wins: 0 };
      current.appearances += row.appearances;
      current.wins += row.wins;
      totalColorAppearances += row.appearances;
      colorMap.set(color, current);
    });
    const pairKey = getColorIdentityGroupKey(colors);
    if (pairKey) {
      const current = pairMap.get(pairKey) || { colors, appearances: 0, wins: 0 };
      current.appearances += row.appearances;
      current.wins += row.wins;
      pairMap.set(pairKey, current);
    }
  });
  const played = MANA_COLOR_ORDER.map((color) => {
    const current = colorMap.get(color) || { appearances: 0, wins: 0 };
    return {
      color,
      appearances: current.appearances,
      wins: current.wins,
      percentage: percentage(current.appearances, totalColorAppearances),
      winRate: percentage(current.wins, current.appearances),
    };
  }).filter((row) => row.appearances > 0);
  const wonTotal = played.reduce((total, row) => total + row.wins, 0);
  const colors: ArenaColorAnalytics = {
    played,
    won: played.filter((row) => row.wins > 0).map((row) => ({
      ...row,
      appearances: row.wins,
      percentage: percentage(row.wins, wonTotal),
      winRate: 100,
    })),
    winRates: [...played]
      .filter((row) => row.appearances >= 3)
      .sort((left, right) => right.winRate - left.winRate || right.appearances - left.appearances),
    pairs: Array.from(pairMap.entries()).map(([key, row]) => ({
      key,
      colors: row.colors,
      guildName: getColorIdentityLabel(row.colors),
      appearances: row.appearances,
      wins: row.wins,
      winRate: percentage(row.wins, row.appearances),
    })).sort((left, right) => right.appearances - left.appearances || right.winRate - left.winRate).slice(0, 5),
    missingColorGames: 0,
    totalGamesWithColors: payload.totalMatches || 0,
  };

  const decks = (payload.decks || []).map<DeckPerformanceStats>((row) => ({
    key: row.key,
    deckId: row.deck_id,
    isGuestDeck: row.is_guest_deck,
    name: row.deck_name,
    commander: row.commander,
    commanderImage: row.commander_image,
    gamesPlayed: row.games_played,
    trackedGames: row.tracked_games,
    trackingCoverage: percentage(row.tracked_games, row.games_played),
    wins: row.wins,
    winRate: percentage(row.wins, row.games_played),
    secondPlaces: row.second_places,
    totalDamageDealt: row.total_damage_dealt,
    averageDamageDealt: row.tracked_games > 0
      ? Math.round(row.total_damage_dealt / row.tracked_games)
      : 0,
    totalDamageTaken: row.total_damage_taken,
    totalLifeGained: row.total_life_gained,
    commanderDamageDealt: row.commander_damage_dealt,
    infectDealt: row.infect_dealt,
    eliminations: row.eliminations,
    groupDamageDealt: row.group_damage_dealt,
    groupDamageEvents: row.group_damage_events,
    medianWinningDurationSeconds: row.median_winning_duration_seconds,
  }));

  const brackets = Array.from(new Set([
    ...(payload.commanders || []).map((row) => row.bracket),
    ...(payload.colors || []).map((row) => row.bracket),
  ].filter((value): value is string => Boolean(value)))).sort(
    (left, right) => left.localeCompare(right, undefined, { numeric: true }),
  );

  return { players, commanders, colors, decks, brackets };
}

export async function fetchArenaAnalyticsPayload(
  client: SupabaseClient,
  groupId: string,
  since: Date | null,
) {
  const { data, error } = await client.rpc('get_arena_analytics_bundle', {
    p_group_id: groupId,
    p_since: since?.toISOString() ?? null,
    p_until: null,
  });
  if (error) throw error;
  return (data || {}) as ArenaAnalyticsBundlePayload;
}

export async function fetchArenaAnalyticsBundle(
  client: SupabaseClient,
  groupId: string,
  since: Date | null,
  bracketFilter = 'all',
  commanderSort: 'winRate' | 'gamesPlayed' = 'winRate',
) {
  return buildArenaAnalyticsBundle(
    await fetchArenaAnalyticsPayload(client, groupId, since),
    bracketFilter,
    commanderSort,
  );
}
