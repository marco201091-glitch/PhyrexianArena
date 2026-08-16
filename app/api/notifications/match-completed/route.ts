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
  const { data: participants } = await admin.from('match_participants').select('user_id').eq('match_id', match.id).not('user_id', 'is', null);
  const participantIds = Array.from(new Set(
    (participants ?? []).map((row) => row.user_id).filter(Boolean) as string[],
  ));
  if (!participantIds.includes(auth.user.id)) {
    return NextResponse.json({ error: 'Only a match participant can send this notification' }, { status: 403 });
  }
  const group = Array.isArray(match.groups) ? match.groups[0] : match.groups;
  const winner = Array.isArray(match.profiles) ? match.profiles[0] : match.profiles;
  const winnerName = winner?.display_name || winner?.username;
  await notifyUsers(admin, participantIds, {
    type: 'match_completed',
    content: {
      it: {
        title: `Partita conclusa · ${group?.name ?? 'Playgroup'}`,
        body: match.is_draw ? 'Pareggio' : `Vince ${winnerName || 'un giocatore'}`,
      },
      en: {
        title: `Match completed · ${group?.name ?? 'Playgroup'}`,
        body: match.is_draw ? 'Draw' : `${winnerName || 'A player'} wins`,
      },
    },
    data: { groupId: match.group_id, matchId: match.id },
    dedupeKey: `match_completed:${match.id}`,
  });
  return NextResponse.json({ ok: true });
}
