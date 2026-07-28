import { NextResponse } from 'next/server';
import { requireAuthOr401 } from '@/app/api/_lib/require-auth';
import { enforceUserRateLimit } from '@/lib/api-rate-limit';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { notifyUsers } from '@/lib/push-notifications-server';

export async function POST(request: Request) {
  const auth = await requireAuthOr401(request);
  if (auth.response) return auth.response;
  const limited = await enforceUserRateLimit(auth.user.id, 'matchCompleted');
  if (limited) return limited;
  const admin = getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: 'Server unavailable' }, { status: 503 });
  const matchId = String((await request.json().catch(() => ({}))).matchId ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(matchId)) return NextResponse.json({ error: 'Invalid match' }, { status: 400 });
  const { data: match } = await admin
    .from('matches')
    .select('id, group_id, is_draw, winner_id, groups(name), profiles:winner_id(username, display_name)')
    .eq('id', matchId)
    .maybeSingle();
  if (!match) return NextResponse.json({ error: 'Match unavailable' }, { status: 404 });
  const { data: actorMember } = await admin.from('group_members').select('id').eq('group_id', match.group_id).eq('user_id', auth.user.id).maybeSingle();
  if (!actorMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { data: participants } = await admin.from('match_participants').select('user_id').eq('match_id', match.id).not('user_id', 'is', null);
  const group = Array.isArray(match.groups) ? match.groups[0] : match.groups;
  const winner = Array.isArray(match.profiles) ? match.profiles[0] : match.profiles;
  const result = match.is_draw ? 'Pareggio' : `Vince ${winner?.display_name || winner?.username || 'un giocatore'}`;
  await notifyUsers(admin, (participants ?? []).map((row) => row.user_id).filter(Boolean) as string[], {
    type: 'match_completed',
    title: `Partita conclusa · ${group?.name ?? 'Arena'}`,
    body: result,
    data: { groupId: match.group_id, matchId: match.id },
    dedupeKey: `match_completed:${match.id}`,
  });
  return NextResponse.json({ ok: true });
}
