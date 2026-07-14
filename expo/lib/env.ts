export function getSupabaseUrl() {
  return process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
}

export function getSupabaseAnonKey() {
  return process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
}

export function getApiBaseUrl() {
  return (process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://phyrexian-arena.vercel.app').replace(/\/$/, '');
}

export function getSiteUrl() {
  return (process.env.EXPO_PUBLIC_SITE_URL ?? getApiBaseUrl()).replace(/\/$/, '');
}

export function getHcaptchaSiteKey() {
  return process.env.EXPO_PUBLIC_HCAPTCHA_SITE_KEY ?? '';
}

export function getSupportEmail() {
  return process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? 'support@phyrexianarena.dpdns.org';
}

export function assertExpoEnv() {
  if (!getSupabaseUrl() || !getSupabaseAnonKey()) {
    throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. Copy expo/.env.example to expo/.env');
  }
}