import type { CommanderMetadataOption } from '@/lib/deck-metadata';

export interface ProfileRow {
  id: string;
  username: string;
  display_name: string | null;
  created_at: string;
}

export interface ProfileDeck {
  id: string;
  user_id: string;
  group_id: string | null;
  name: string;
  commander: string;
  commander_image: string | null;
  source_url: string | null;
  source_type: string | null;
  bracket: string | null;
  color_identity: string[] | null;
  commander_options: CommanderMetadataOption[] | null;
  commander_cmc: number | null;
  created_at: string;
  updated_at: string;
}

export interface DeckWinRate {
  gamesPlayed: number;
  wins: number;
  winRate: number;
}

export interface DeckPerformance extends DeckWinRate {
  trackedGames: number;
  trackingCoverage: number;
  secondPlaces: number;
  damageDealt: number;
  damageTaken: number;
  lifeGained: number;
  commanderDamage: number;
  infectDealt: number;
  eliminations: number;
  medianWinningDurationSeconds: number | null;
}
