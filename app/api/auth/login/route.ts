import { NextResponse } from 'next/server';
import { applyIpRateLimit } from '@/app/api/_lib/with-rate-limit';
import { getSupabaseServerConfig } from '@/lib/supabase/server-env';

export const runtime = 'nodejs';

const invalidCredentials = () =>
  NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });

async function resolveLoginEmail(url: string, serviceRoleKey: string, identifier: string) {
  const response = await fetch(`${url}/rest/v1/rpc/resolve_login_email`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ identifier }),
    cache: 'no-store',
  });

  if (!response.ok) throw new Error(`Identifier resolution failed (${response.status}).`);
  const email = await response.json().catch(() => null);
  return typeof email === 'string' && email ? email : null;
}

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

  const { url, anonKey } = getSupabaseServerConfig();
  let email = identifier;
  if (!identifier.includes('@')) {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: 'Authentication service unavailable.' },
        { status: 503 },
      );
    }
    try {
      const resolvedEmail = await resolveLoginEmail(url, serviceRoleKey, identifier);
      if (!resolvedEmail) return invalidCredentials();
      email = resolvedEmail;
    } catch (error) {
      console.error('Login identifier resolution failed:', error);
      return NextResponse.json(
        { error: 'Authentication service unavailable.' },
        { status: 503 },
      );
    }
  }

  const authResponse = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
    cache: 'no-store',
  });
  if (!authResponse.ok) return invalidCredentials();

  const session = await authResponse.json().catch(() => null) as {
    access_token?: string;
    refresh_token?: string;
  } | null;
  if (!session?.access_token || !session.refresh_token) return invalidCredentials();

  return NextResponse.json({
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
  });
}
