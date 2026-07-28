import 'server-only';

export function getSupabaseServerUrl() {
  return process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
}

export function getSupabaseServerAnonKey() {
  return process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
}

export function getSupabaseServerConfig() {
  const url = getSupabaseServerUrl();
  const anonKey = getSupabaseServerAnonKey();

  if (!url || !anonKey) {
    throw new Error('Missing server-side Supabase URL or anon key.');
  }

  return { url, anonKey };
}
