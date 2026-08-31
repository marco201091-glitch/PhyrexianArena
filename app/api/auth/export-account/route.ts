import { NextResponse } from 'next/server';
import packageJson from '@/package.json';
import { requireAuthOr401 } from '@/app/api/_lib/require-auth';
import { enforceUserRateLimit } from '@/lib/api-rate-limit';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const auth = await requireAuthOr401(request);
  if (auth.response) return auth.response;
  const limited = await enforceUserRateLimit(auth.user.id, 'accountExport');
  if (limited) return limited;
  const admin = getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: 'Server unavailable' }, { status: 503 });

  const userId = auth.user.id;
  const [profile, decks, memberships, ownedGroups, participations, notifications, preferences, accessLogs, invitations] = await Promise.all([
    admin.from('profiles').select('*').eq('id', userId).maybeSingle(),
    admin.from('decks').select('*').eq('user_id', userId).order('created_at'),
    admin.from('group_members').select('*').eq('user_id', userId).order('joined_at'),
    admin.from('groups').select('*').eq('created_by', userId).order('created_at'),
    admin.from('match_participants').select('*').eq('user_id', userId),
    admin.from('app_notifications').select('id, type, title, body, data, read_at, created_at').eq('user_id', userId).order('created_at'),
    admin.from('notification_preferences').select('*').eq('user_id', userId).maybeSingle(),
    admin.from('access_logs').select('source, app_version, accessed_at').eq('user_id', userId).order('accessed_at'),
    admin.from('arena_invitations').select('*').or(`invited_user_id.eq.${userId},invited_by.eq.${userId}`).order('created_at'),
  ]);
  const matchIds = Array.from(new Set((participations.data ?? []).map((row) => row.match_id).filter(Boolean)));
  const matches = matchIds.length
    ? await admin.from('matches').select('*').in('id', matchIds).order('played_at')
    : { data: [], error: null };
  const failed = [profile, decks, memberships, ownedGroups, participations, notifications, preferences, accessLogs, invitations, matches]
    .find((result) => result.error);
  if (failed?.error) return NextResponse.json({ error: 'Account export failed.' }, { status: 500 });

  const payload = {
    format: 'phyrexian-arena-account-export',
    schemaVersion: 1,
    appVersion: packageJson.version,
    exportedAt: new Date().toISOString(),
    account: { id: userId, email: auth.user.email ?? null, createdAt: auth.user.created_at },
    profile: profile.data,
    decks: decks.data ?? [],
    memberships: memberships.data ?? [],
    ownedGroups: ownedGroups.data ?? [],
    matches: matches.data ?? [],
    participations: participations.data ?? [],
    notifications: notifications.data ?? [],
    notificationPreferences: preferences.data,
    accessLogs: accessLogs.data ?? [],
    invitations: invitations.data ?? [],
  };
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="mtg-tracker-account-${stamp}.json"`,
      'Cache-Control': 'no-store',
    },
  });
}
