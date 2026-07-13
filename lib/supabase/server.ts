import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getAuthCookieOptions } from '@/lib/auth-persistence';

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  const requestCookies = cookieStore.getAll();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: getAuthCookieOptions(requestCookies),
      auth: {
        detectSessionInUrl: false,
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components cannot always write cookies; middleware handles refresh.
          }
        },
      },
    },
  );
}