import '@/lib/crypto-polyfill';
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { authStorage } from '@/lib/auth-persistence';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/env';

export const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
  auth: {
    flowType: 'pkce',
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});