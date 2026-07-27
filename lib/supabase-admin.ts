import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServerUrl } from '@/lib/supabase/server-env';

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdminClient() {
  const supabaseUrl = getSupabaseServerUrl();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  if (!adminClient) {
    adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return adminClient;
}
