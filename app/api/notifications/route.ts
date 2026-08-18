import { NextResponse } from 'next/server';
import { requireAuthOr401 } from '@/app/api/_lib/require-auth';
import { enforceUserRateLimit } from '@/lib/api-rate-limit';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

const DEFAULT_PREFERENCES = {
  arena_invite: true,
  arena_member_joined: true,
  match_completed: true,
  push_enabled: true,
};

export async function GET(request: Request) {
  const auth = await requireAuthOr401(request);
  if (auth.response) return auth.response;
  const limited = await enforceUserRateLimit(auth.user.id, 'notifications');
  if (limited) return limited;
  const admin = getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: 'Server unavailable' }, { status: 503 });

  const [{ data: notifications, error }, preferenceResult] = await Promise.all([
    admin
      .from('app_notifications')
      .select('id, type, title, body, data, read_at, created_at')
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: false })
      .limit(50),
    admin
      .from('notification_preferences')
      .select('arena_invite, arena_member_joined, match_completed, push_enabled')
      .eq('user_id', auth.user.id)
      .maybeSingle(),
  ]);
  if (error) return NextResponse.json({ error: 'Notifications unavailable' }, { status: 500 });
  return NextResponse.json({
    notifications: notifications ?? [],
    preferences: { ...DEFAULT_PREFERENCES, ...(preferenceResult.data ?? {}) },
  });
}

export async function PATCH(request: Request) {
  const auth = await requireAuthOr401(request);
  if (auth.response) return auth.response;
  const limited = await enforceUserRateLimit(auth.user.id, 'notifications');
  if (limited) return limited;
  const admin = getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: 'Server unavailable' }, { status: 503 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;

  if (body.action === 'readAll') {
    const { error } = await admin
      .from('app_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', auth.user.id)
      .is('read_at', null);
    return error
      ? NextResponse.json({ error: 'Could not update notifications' }, { status: 500 })
      : NextResponse.json({ ok: true });
  }

  if (body.action === 'read' && typeof body.id === 'string') {
    const { error } = await admin
      .from('app_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', body.id)
      .eq('user_id', auth.user.id);
    return error
      ? NextResponse.json({ error: 'Could not update notification' }, { status: 500 })
      : NextResponse.json({ ok: true });
  }

  if (body.action === 'preferences' && body.preferences && typeof body.preferences === 'object') {
    const input = body.preferences as Record<string, unknown>;
    const preferences = Object.fromEntries(
      Object.keys(DEFAULT_PREFERENCES)
        .filter((key) => typeof input[key] === 'boolean')
        .map((key) => [key, input[key]]),
    );
    if (!Object.keys(preferences).length) {
      return NextResponse.json({ error: 'Invalid preferences' }, { status: 400 });
    }
    const { error } = await admin.from('notification_preferences').upsert({
      user_id: auth.user.id,
      ...preferences,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    return error
      ? NextResponse.json({ error: 'Could not save preferences' }, { status: 500 })
      : NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Invalid notification action' }, { status: 400 });
}
