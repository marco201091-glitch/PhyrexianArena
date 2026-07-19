export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          display_name?: string | null;
          created_at?: string;
        };
      };
      groups: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          invite_code: string;
          created_by: string;
          created_at: string;
          is_public: boolean;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          invite_code?: string;
          created_by: string;
          created_at?: string;
          is_public?: boolean;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          invite_code?: string;
          created_by?: string;
          created_at?: string;
          is_public?: boolean;
        };
      };
      group_members: {
        Row: {
          id: string;
          group_id: string | null;
          user_id: string;
          joined_at: string;
        };
        Insert: {
          id?: string;
          group_id: string | null;
          user_id: string;
          joined_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          user_id?: string;
          joined_at?: string;
        };
      };
      arena_guests: {
        Row: {
          id: string;
          group_id: string;
          display_name: string;
          normalized_name: string;
          created_at: string;
          last_played_at: string | null;
        };
        Insert: {
          id?: string;
          group_id: string;
          display_name: string;
          normalized_name: string;
          created_at?: string;
          last_played_at?: string | null;
        };
        Update: {
          id?: string;
          group_id?: string;
          display_name?: string;
          normalized_name?: string;
          created_at?: string;
          last_played_at?: string | null;
        };
      };
      arena_guest_decks: {
        Row: {
          id: string;
          guest_id: string;
          group_id: string;
          name: string;
          commander: string;
          commander_image: string | null;
          color_identity: string[] | null;
          commander_options: Json | null;
          bracket: string | null;
          commander_cmc: number | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          guest_id: string;
          group_id: string;
          name: string;
          commander: string;
          commander_image?: string | null;
          color_identity?: string[] | null;
          commander_options?: Json | null;
          bracket?: string | null;
          commander_cmc?: number | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          guest_id?: string;
          group_id?: string;
          name?: string;
          commander?: string;
          commander_image?: string | null;
          color_identity?: string[] | null;
          commander_options?: Json | null;
          bracket?: string | null;
          commander_cmc?: number | null;
          created_at?: string;
          updated_at?: string | null;
        };
      };
      decks: {
        Row: {
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
          commander_options: Json | null;
          commander_cmc: number | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          group_id?: string | null;
          name: string;
          commander: string;
          commander_image?: string | null;
          source_url?: string | null;
          source_type?: string | null;
          bracket?: string | null;
          color_identity?: string[] | null;
          commander_options?: Json | null;
          commander_cmc?: number | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          group_id?: string | null;
          name?: string;
          commander?: string;
          commander_image?: string | null;
          source_url?: string | null;
          source_type?: string | null;
          bracket?: string | null;
          color_identity?: string[] | null;
          commander_options?: Json | null;
          commander_cmc?: number | null;
          created_at?: string;
          updated_at?: string | null;
        };
      };
      matches: {
        Row: {
          id: string;
          group_id: string | null;
          winner_id: string | null;
          winner_guest_id: string | null;
          is_draw: boolean;
          played_at: string;
          created_by: string;
          notes: string | null;
          starting_life: number | null;
          duration_seconds: number | null;
          live_game_log: Json;
          win_condition: string | null;
          tracking_version: number | null;
        };
        Insert: {
          id?: string;
          group_id: string | null;
          winner_id?: string | null;
          winner_guest_id?: string | null;
          is_draw?: boolean;
          played_at?: string;
          created_by: string;
          notes?: string | null;
          starting_life?: number | null;
          duration_seconds?: number | null;
          live_game_log?: Json;
          win_condition?: string | null;
          tracking_version?: number | null;
        };
        Update: {
          id?: string;
          group_id?: string;
          winner_id?: string | null;
          winner_guest_id?: string | null;
          is_draw?: boolean;
          played_at?: string;
          created_by?: string;
          notes?: string | null;
          starting_life?: number | null;
          duration_seconds?: number | null;
          live_game_log?: Json;
          win_condition?: string | null;
          tracking_version?: number | null;
        };
      };
      live_games: {
        Row: {
          id: string;
          group_id: string;
          created_by: string;
          status: string;
          starting_life: number;
          state: Json;
          match_id: string | null;
          started_at: string | null;
          ended_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          created_by: string;
          status?: string;
          starting_life?: number;
          state?: Json;
          match_id?: string | null;
          started_at?: string | null;
          ended_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          created_by?: string;
          status?: string;
          starting_life?: number;
          state?: Json;
          match_id?: string | null;
          started_at?: string | null;
          ended_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      live_game_telemetry: {
        Row: {
          id: string;
          user_id: string;
          live_game_id: string | null;
          session_id: string;
          client_platform: string;
          mutation_syncs: number;
          version_conflicts: number;
          failed_syncs: number;
          max_queue_depth: number;
          slowest_sync_ms: number;
          last_error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          live_game_id?: string | null;
          session_id: string;
          client_platform: string;
          mutation_syncs?: number;
          version_conflicts?: number;
          failed_syncs?: number;
          max_queue_depth?: number;
          slowest_sync_ms?: number;
          last_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          live_game_id?: string | null;
          session_id?: string;
          client_platform?: string;
          mutation_syncs?: number;
          version_conflicts?: number;
          failed_syncs?: number;
          max_queue_depth?: number;
          slowest_sync_ms?: number;
          last_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      match_participants: {
        Row: {
          id: string;
          match_id: string;
          user_id: string | null;
          guest_id: string | null;
          deck_id: string | null;
          guest_deck_id: string | null;
          is_winner: boolean;
          tracked_event_count: number;
          life_lost: number;
          life_gained: number;
          life_damage_dealt: number;
          unattributed_life_lost: number;
          commander_damage_taken: number;
          commander_damage_dealt: number;
          infect_received: number;
          infect_dealt: number;
          eliminations: number;
          eliminations_caused: number;
          revives: number;
          corrections: number;
          placement: number | null;
          eliminated_at: string | null;
          was_starting_player: boolean;
          group_damage_dealt: number;
          group_damage_events: number;
          participant_name_snapshot: string | null;
          deck_name_snapshot: string | null;
          commander_snapshot: string | null;
          commander_image_snapshot: string | null;
          deck_bracket_snapshot: string | null;
          color_identity_snapshot: string[] | null;
          final_life: number | null;
          final_infect: number | null;
        };
        Insert: {
          id?: string;
          match_id: string;
          user_id?: string | null;
          guest_id?: string | null;
          deck_id?: string | null;
          guest_deck_id?: string | null;
          is_winner?: boolean;
          tracked_event_count?: number;
          life_lost?: number;
          life_gained?: number;
          life_damage_dealt?: number;
          unattributed_life_lost?: number;
          commander_damage_taken?: number;
          commander_damage_dealt?: number;
          infect_received?: number;
          infect_dealt?: number;
          eliminations?: number;
          eliminations_caused?: number;
          revives?: number;
          corrections?: number;
          placement?: number | null;
          eliminated_at?: string | null;
          was_starting_player?: boolean;
          group_damage_dealt?: number;
          group_damage_events?: number;
          participant_name_snapshot?: string | null;
          deck_name_snapshot?: string | null;
          commander_snapshot?: string | null;
          commander_image_snapshot?: string | null;
          deck_bracket_snapshot?: string | null;
          color_identity_snapshot?: string[] | null;
          final_life?: number | null;
          final_infect?: number | null;
        };
        Update: {
          id?: string;
          match_id?: string;
          user_id?: string | null;
          guest_id?: string | null;
          deck_id?: string | null;
          guest_deck_id?: string | null;
          is_winner?: boolean;
          tracked_event_count?: number;
          life_lost?: number;
          life_gained?: number;
          life_damage_dealt?: number;
          unattributed_life_lost?: number;
          commander_damage_taken?: number;
          commander_damage_dealt?: number;
          infect_received?: number;
          infect_dealt?: number;
          eliminations?: number;
          eliminations_caused?: number;
          revives?: number;
          corrections?: number;
          placement?: number | null;
          eliminated_at?: string | null;
          was_starting_player?: boolean;
          group_damage_dealt?: number;
          group_damage_events?: number;
          participant_name_snapshot?: string | null;
          deck_name_snapshot?: string | null;
          commander_snapshot?: string | null;
          commander_image_snapshot?: string | null;
          deck_bracket_snapshot?: string | null;
          color_identity_snapshot?: string[] | null;
          final_life?: number | null;
          final_infect?: number | null;
        };
      };
      access_logs: {
        Row: {
          id: string;
          user_id: string;
          source: string;
          accessed_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          source?: string;
          accessed_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          source?: string;
          accessed_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      resolve_login_email: {
        Args: {
          identifier: string;
        };
        Returns: string | null;
      };
      is_admin: {
        Args: {
          p_user_id?: string;
        };
        Returns: boolean;
      };
      is_demo_user: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      get_group_by_invite_code: {
        Args: {
          p_invite_code: string;
        };
        Returns: Array<{
          id: string;
          name: string;
          description: string | null;
        }>;
      };
      record_user_access: {
        Args: {
          p_user_id: string;
          p_source?: string;
        };
        Returns: Json;
      };
      purge_old_access_logs: {
        Args: {
          p_retention_days?: number;
        };
        Returns: number;
      };
      purge_old_live_game_telemetry: {
        Args: {
          p_retention_days?: number;
        };
        Returns: number;
      };
      purge_finished_live_games: {
        Args: {
          p_retention_days?: number;
        };
        Returns: number;
      };
      get_arena_member_decks: {
        Args: {
          p_group_id: string;
          p_user_ids: string[];
          p_limit_per_user?: number;
        };
        Returns: Array<{
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
          created_at: string;
        }>;
      };
      get_arena_analytics_bundle: {
        Args: {
          p_group_id: string;
          p_since?: string | null;
          p_until?: string | null;
        };
        Returns: Json;
      };
      get_personal_analytics_facts: {
        Args: {
          p_user_id?: string | null;
        };
        Returns: Array<{
          is_winner: boolean;
          deck_id: string;
          played_at: string;
          name: string;
          commander: string;
          commander_image: string | null;
          color_identity: string[] | null;
          bracket: string | null;
          source_type: string | null;
          source_url: string | null;
          owner_username: string | null;
        }>;
      };
      get_global_analytics_facts: {
        Args: Record<string, never>;
        Returns: Array<{
          is_winner: boolean;
          deck_id: string;
          played_at: string;
          name: string;
          commander: string;
          commander_image: string | null;
          color_identity: string[] | null;
          bracket: string | null;
          source_type: string | null;
          source_url: string | null;
          owner_username: string | null;
        }>;
      };
      list_access_logs_for_admin: {
        Args: {
          p_limit?: number;
          p_from?: string | null;
          p_to?: string | null;
        };
        Returns: Array<{
          id: string;
          username: string;
          source: string;
          accessed_at: string;
        }>;
      };
      get_arena_stats_participants: {
        Args: {
          p_group_id: string;
          p_since?: string | null;
        };
        Returns: Array<{
          match_id: string;
          played_at: string;
          is_draw: boolean;
          duration_seconds: number | null;
          win_condition: string | null;
          tracking_version: number | null;
          user_id: string | null;
          guest_id: string | null;
          deck_id: string | null;
          guest_deck_id: string | null;
          is_winner: boolean;
          placement: number | null;
          was_starting_player: boolean;
          tracked_event_count: number;
          life_lost: number;
          life_gained: number;
          life_damage_dealt: number;
          commander_damage_taken: number;
          commander_damage_dealt: number;
          infect_received: number;
          infect_dealt: number;
          eliminations_caused: number;
          group_damage_dealt: number;
          group_damage_events: number;
          username: string | null;
          display_name: string | null;
          guest_display_name: string | null;
          deck_name: string | null;
          deck_commander: string | null;
          deck_commander_image: string | null;
          deck_bracket: string | null;
          deck_color_identity: string[] | null;
          guest_deck_name: string | null;
          guest_deck_commander: string | null;
          guest_deck_commander_image: string | null;
          guest_deck_bracket: string | null;
          guest_deck_color_identity: string[] | null;
        }>;
      };
      get_arena_match_day_summaries: {
        Args: {
          p_group_id: string;
          p_boundary_hour?: number;
        };
        Returns: Array<{
          day_key: string;
          match_count: number;
          latest_played_at: string;
        }>;
      };
      get_arena_matches_for_day: {
        Args: {
          p_group_id: string;
          p_start: string;
          p_end: string;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
