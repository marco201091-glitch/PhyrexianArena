import type { SupabaseClient } from '@supabase/supabase-js';
import type { DeckPerformance, DeckWinRate } from '@/lib/types/profile';

export type ProfileDeckPerformanceRow = {
  deck_id: string;
  games_played: number;
  wins: number;
  mastery_points: number;
  tracked_games: number;
  second_places: number;
  damage_dealt: number | string;
  damage_taken: number | string;
  life_gained: number | string;
  commander_damage: number | string;
  infect_dealt: number | string;
  eliminations: number | string;
  median_winning_duration_seconds: number | null;
};

export type ProfileDeckPerformanceMaps = {
  winRates: Record<string, DeckWinRate>;
  performance: Record<string, DeckPerformance>;
};

export function buildProfileDeckPerformanceMaps(
  rows: ProfileDeckPerformanceRow[],
): ProfileDeckPerformanceMaps {
  const winRates: Record<string, DeckWinRate> = {};
  const performance: Record<string, DeckPerformance> = {};

  rows.forEach((row) => {
    const gamesPlayed = Number(row.games_played || 0);
    const wins = Number(row.wins || 0);
    const trackedGames = Number(row.tracked_games || 0);
    const winRate = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0;
    winRates[row.deck_id] = { gamesPlayed, wins, winRate };
    performance[row.deck_id] = {
      gamesPlayed,
      wins,
      winRate,
      masteryPoints: Number(row.mastery_points || (wins * 3 + Math.max(0, gamesPlayed - wins))),
      trackedGames,
      trackingCoverage: gamesPlayed > 0
        ? Math.round((trackedGames / gamesPlayed) * 100)
        : 0,
      secondPlaces: Number(row.second_places || 0),
      damageDealt: Number(row.damage_dealt || 0),
      damageTaken: Number(row.damage_taken || 0),
      lifeGained: Number(row.life_gained || 0),
      commanderDamage: Number(row.commander_damage || 0),
      infectDealt: Number(row.infect_dealt || 0),
      eliminations: Number(row.eliminations || 0),
      medianWinningDurationSeconds: row.median_winning_duration_seconds,
    };
  });

  return { winRates, performance };
}

export async function fetchProfileDeckPerformance(
  client: SupabaseClient,
  userId: string,
): Promise<ProfileDeckPerformanceMaps | null> {
  const { data, error } = await client.rpc('get_profile_deck_performance', {
    p_user_id: userId,
  });
  if (error) return null;
  return buildProfileDeckPerformanceMaps((data || []) as ProfileDeckPerformanceRow[]);
}
