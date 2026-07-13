import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getAuthCookieOptions } from '@/lib/auth-persistence';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let browserClient: SupabaseClient | null = null;
let activeCookieSignature = '';

function getCookieSignature() {
  return JSON.stringify(getAuthCookieOptions());
}

export function createBrowserSupabaseClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: getAuthCookieOptions(),
    isSingleton: false,
    auth: {
      // Callback exchange is handled explicitly in /auth/callback route.
      detectSessionInUrl: false,
    },
  });
}

function getClient() {
  const signature = getCookieSignature();
  if (!browserClient || activeCookieSignature !== signature) {
    browserClient = createBrowserSupabaseClient();
    activeCookieSignature = signature;
  }
  return browserClient;
}

export function resetSupabaseClient() {
  browserClient = null;
  activeCookieSignature = '';
  return getClient();
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, property, receiver) {
    const client = getClient();
    const value = Reflect.get(client, property, receiver);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});