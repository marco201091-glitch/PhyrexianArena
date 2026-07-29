import type { SupabaseClient } from '@supabase/supabase-js';
import type { ArenaAward, ArenaAwardKind } from '@/lib/arena-awards';
import type { ArenaColorAnalytics } from '@/lib/arena-color-analytics';
import type { CommanderStats, DeckStatsSort } from '@/lib/arena-deck-stats';
import type { ArenaDateFilter } from '@/lib/arena-filters';
import {
  getColorIdentityGroupKey,
  getColorIdentityLabel,
  getPlayableManaColors,
  MANA_COLOR_ORDER,
} from '@/lib/mana-colors-core';
import type { PlayerStats } from '@/lib/types/arena';

type PlayerRollup = {
  key: string;
  user_id: string | null;
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
  deck_name: string;
  commander: string;
  commander_image: string | null;
  games_played: number;
  tracked_games: number;
  wins: number;
  second_places: number;
  first_eliminations: number;
  comeback_wins: number;
  combo_wins: number;
  alternate_wins: number;
  eliminations: number;
  group_damage_dealt: number;
  median_winning_duration_seconds: number | null;
};

export type ArenaAnalyticsPayload = {
  players?: PlayerRollup[];
  commanders?: CommanderRollup[];
  colors?: ColorRollup[];
  decks?: DeckRollup[];
  totalMatches?: number;
};

export type ArenaAnalyticsView = {
  totalMatches: number;
  players: PlayerStats[];
  commanders: CommanderStats[];
  colors: ArenaColorAnalytics;
  awards: ArenaAward[];
  brackets: string[];
};

const emptyView: ArenaAnalyticsView = {
  totalMatches: 0,
  players: [],
  commanders: [],
  colors: {
    played: [],
    won: [],
    winRates: [],
    pairs: [],
    missingColorGames: 0,
    totalGamesWithColors: 0,
  },
  awards: [],
  brackets: [],
};

function percentage(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

export function getAnalyticsSince(dateFilter: ArenaDateFilter): string | null {
  if (dateFilter === 'all') return null;
  const days = dateFilter === '7d' ? 7 : dateFilter === '30d' ? 30 : 90;
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);
  return since.toISOString();
}

function buildAwards(decks: DeckRollup[]): ArenaAward[] {
  const eligible = decks.filter((deck) => deck.tracked_games >= 3);
  const awards: ArenaAward[] = [];
  const add = (kind: ArenaAwardKind, deck: DeckRollup | undefined, value: number | null) => {
    if (!deck || value == null || value <= 0) return;
    awards.push({
      kind,
      deckId: deck.deck_id,
      name: deck.deck_name,
      commander: deck.commander,
      commanderImage: deck.commander_image,
      gamesPlayed: deck.games_played,
      trackedGames: deck.tracked_games,
      value,
    });
  };
  const top = (rows: DeckRollup[], selector: (deck: DeckRollup) => number, ascending = false) =>
    [...rows].sort((left, right) => (
      ascending
        ? selector(left) - selector(right)
        : selector(right) - selector(left)
    ) || right.tracked_games - left.tracked_games)[0];

  const fastest = top(
    eligible.filter((deck) => deck.median_winning_duration_seconds != null),
    (deck) => deck.median_winning_duration_seconds ?? Number.MAX_SAFE_INTEGER,
    true,
  );
  add('fastest', fastest, fastest?.median_winning_duration_seconds ?? null);
  const slugger = top(eligible, (deck) => deck.group_damage_dealt);
  add('group_slugger', slugger, slugger?.group_damage_dealt ?? null);
  const executioner = top(eligible, (deck) => deck.eliminations);
  add('executioner', executioner, executioner?.eliminations ?? null);
  const runnerUp = top(eligible, (deck) => deck.second_places);
  add('runner_up', runnerUp, runnerUp?.second_places ?? null);
  const archenemy = top(eligible, (deck) => deck.first_eliminations);
  add('archenemy', archenemy, archenemy?.first_eliminations ?? null);
  const comebacker = top(eligible, (deck) => deck.comeback_wins);
  add('comebacker', comebacker, comebacker?.comeback_wins ?? null);
  const oneTrick = top(decks, (deck) => deck.games_played);
  add('one_trick', oneTrick, oneTrick?.games_played ?? null);
  const comboWinner = top(decks, (deck) => deck.combo_wins);
  add('combo_winner', comboWinner, comboWinner?.combo_wins ?? null);
  const junkMaster = top(decks, (deck) => deck.alternate_wins);
  add('junk_master', junkMaster, junkMaster?.alternate_wins ?? null);
  return awards;
}

export function buildArenaAnalyticsView(
  payload: ArenaAnalyticsPayload,
  bracketFilter = 'all',
  deckStatsSort: DeckStatsSort = 'winRate',
): ArenaAnalyticsView {
  const players = (payload.players ?? []).map<PlayerStats>((row) => ({
    key: row.key,
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
  })).sort((left, right) => (
    right.winRate - left.winRate
    || right.wins - left.wins
    || right.gamesPlayed - left.gamesPlayed
  ));

  const commanders = (payload.commanders ?? [])
    .filter((row) => bracketFilter === 'all' || row.bracket === bracketFilter)
    .map<CommanderStats>((row) => ({
      key: `${row.commander}::${row.bracket ?? 'none'}`,
      commander: row.commander,
      commanderImageUrl: row.commander_image,
      bracket: row.bracket,
      gamesPlayed: row.games_played,
      wins: row.wins,
      winRate: percentage(row.wins, row.games_played),
    }))
    .sort((left, right) => deckStatsSort === 'gamesPlayed'
      ? right.gamesPlayed - left.gamesPlayed || right.wins - left.wins
      : right.winRate - left.winRate || right.wins - left.wins);

  const filteredColors = (payload.colors ?? []).filter(
    (row) => bracketFilter === 'all' || row.bracket === bracketFilter,
  );
  const colorMap = new Map<string, { appearances: number; wins: number }>(
    MANA_COLOR_ORDER.map((color) => [color, { appearances: 0, wins: 0 }]),
  );
  const pairMap = new Map<string, { colors: string[]; appearances: number; wins: number }>();
  let totalColorAppearances = 0;
  filteredColors.forEach((row) => {
    const identity = getPlayableManaColors(row.color_identity ?? []);
    identity.forEach((color) => {
      const current = colorMap.get(color) ?? { appearances: 0, wins: 0 };
      current.appearances += row.appearances;
      current.wins += row.wins;
      totalColorAppearances += row.appearances;
      colorMap.set(color, current);
    });
    const key = getColorIdentityGroupKey(identity);
    if (key) {
      const current = pairMap.get(key) ?? { colors: identity, appearances: 0, wins: 0 };
      current.appearances += row.appearances;
      current.wins += row.wins;
      pairMap.set(key, current);
    }
  });
  const played = MANA_COLOR_ORDER.map((color) => {
    const current = colorMap.get(color) ?? { appearances: 0, wins: 0 };
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
    })).sort((left, right) => right.appearances - left.appearances).slice(0, 5),
    missingColorGames: 0,
    totalGamesWithColors: payload.totalMatches ?? 0,
  };

  return {
    totalMatches: payload.totalMatches ?? 0,
    players,
    commanders,
    colors,
    awards: buildAwards(payload.decks ?? []),
    brackets: Array.from(new Set([
      ...(payload.commanders ?? []).map((row) => row.bracket),
      ...(payload.colors ?? []).map((row) => row.bracket),
    ].filter((value): value is string => Boolean(value)))).sort(
      (left, right) => left.localeCompare(right, undefined, { numeric: true }),
    ),
  };
}

export async function fetchArenaAnalytics(
  client: SupabaseClient,
  groupId: string,
  dateFilter: ArenaDateFilter,
): Promise<ArenaAnalyticsPayload> {
  const { data, error } = await client.rpc('get_arena_analytics_bundle', {
    p_group_id: groupId,
    p_since: getAnalyticsSince(dateFilter),
    p_until: null,
  });
  if (error) throw error;
  return (data ?? {}) as ArenaAnalyticsPayload;
}

export function createEmptyArenaAnalyticsView() {
  return emptyView;
}
