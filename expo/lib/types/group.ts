export interface ArenaGroup {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  created_by: string;
  created_at: string;
  profiles: { username: string; display_name: string | null };
  group_members: Array<{ user_id: string }>;
}