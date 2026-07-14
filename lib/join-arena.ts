import type { SupabaseClient } from '@supabase/supabase-js';

export interface GroupInvitePreview {
  id: string;
  name: string;
  description: string | null;
}

export function normalizeInviteCode(code: string) {
  return code.trim().toUpperCase();
}

export async function fetchGroupByInviteCode(
  supabase: SupabaseClient,
  inviteCode: string,
): Promise<GroupInvitePreview | null> {
  const { data, error } = await supabase.rpc('get_group_by_invite_code', {
    p_invite_code: normalizeInviteCode(inviteCode),
  });

  if (error) {
    throw error;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== 'object' || !('id' in row)) {
    return null;
  }

  return row as GroupInvitePreview;
}