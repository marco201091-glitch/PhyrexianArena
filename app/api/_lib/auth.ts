import { createClient } from '@supabase/supabase-js';
import { getSupabaseServerUrl, getSupabaseServerAnonKey } from '@/lib/supabase/server-env';

export async function requireAuthenticatedUser(request: Request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : '';

  if (!token) return null;

  const supabaseUrl = getSupabaseServerUrl();
  const supabaseAnonKey = getSupabaseServerAnonKey();
  if (!supabaseUrl || !supabaseAnonKey) return null;

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;

  return data.user;
}
