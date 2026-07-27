import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { applyIpRateLimit } from '@/app/api/_lib/with-rate-limit';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { getSupabaseServerConfig } from '@/lib/supabase/server-env';

export const runtime = 'nodejs';

const invalidCredentials = () =>
  NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });

export async function POST(request: Request) {
  const rateLimited = await applyIpRateLimit(request, 'authLogin');
  if (rateLimited) return rateLimited;

  const body = await request.json().catch(() => ({})) as {
    identifier?: unknown;
    password?: unknown;
  };
  const identifier = typeof body.identifier === 'string' ? body.identifier.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!identifier || identifier.length > 320 || !password || password.length > 1024) {
    return invalidCredentials();
  }

  let email = identifier;
  if (!identifier.includes('@')) {
    const admin = getSupabaseAdminClient();
    if (!admin) {
      return NextResponse.json(
        { error: 'Authentication service unavailable.' },
        { status: 503 },
      );
    }
    const { data, error } = await admin.rpc('resolve_login_email', { identifier });
    if (error) {
      console.error('Login identifier resolution failed:', error.message);
      return NextResponse.json(
        { error: 'Authentication service unavailable.' },
        { status: 503 },
      );
    }
    if (!data) return invalidCredentials();
    email = data;
  }

  const { url, anonKey } = getSupabaseServerConfig();
  const authClient = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
  const { data, error } = await authClient.auth.signInWithPassword({ email, password });
  if (error || !data.session) return invalidCredentials();

  return NextResponse.json({
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
  });
}
