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
          played_at: string;
          created_by: string;
          notes: string | null;
        };
        Insert: {
          id?: string;
          group_id: string | null;
          winner_id?: string | null;
          winner_guest_id?: string | null;
          played_at?: string;
          created_by: string;
          notes?: string | null;
        };
        Update: {
          id?: string;
          group_id?: string;
          winner_id?: string | null;
          winner_guest_id?: string | null;
          played_at?: string;
          created_by?: string;
          notes?: string | null;
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
        };
        Insert: {
          id?: string;
          match_id: string;
          user_id?: string | null;
          guest_id?: string | null;
          deck_id?: string | null;
          guest_deck_id?: string | null;
          is_winner?: boolean;
        };
        Update: {
          id?: string;
          match_id?: string;
          user_id?: string | null;
          guest_id?: string | null;
          deck_id?: string | null;
          guest_deck_id?: string | null;
          is_winner?: boolean;
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
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}