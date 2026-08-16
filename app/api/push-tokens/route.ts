import { NextResponse } from 'next/server';
import { requireAuthOr401 } from '@/app/api/_lib/require-auth';
import { enforceUserRateLimit } from '@/lib/api-rate-limit';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

const EXPO_TOKEN_RE = /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/;

export async function POST(request: Request) {
  const auth = await requireAuthOr401(request);
  if (auth.response) return auth.response;
  const limited = await enforceUserRateLimit(auth.user.id, 'pushToken');
  if (limited) return limited;
  const admin = getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: 'Server unavailable' }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const token = typeof body.token === 'string' ? body.token : '';
  const platform = body.platform === 'ios' ? 'ios' : body.platform === 'android' ? 'android' : null;
  const locale = body.locale === 'en' ? 'en' : 'it';
  if (!EXPO_TOKEN_RE.test(token) || !platform) return NextResponse.json({ error: 'Invalid push token' }, { status: 400 });
  let result = await admin.from('push_tokens').upsert({
    user_id: auth.user.id,
    expo_push_token: token,
    platform,
    locale,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'expo_push_token' });
  if (result.error) {
    result = await admin.from('push_tokens').upsert({
      user_id: auth.user.id, expo_push_token: token, platform, updated_at: new Date().toISOString(),
    }, { onConflict: 'expo_push_token' });
  }
  if (result.error) return NextResponse.json({ error: 'Token registration failed' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
