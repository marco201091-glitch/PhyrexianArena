import { NextResponse } from 'next/server';
import { requireAuthOr401 } from '@/app/api/_lib/require-auth';
import { enforceUserRateLimit } from '@/lib/api-rate-limit';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { notifyUsers } from '@/lib/push-notifications-server';

export async function POST(request: Request) {
  const auth = await requireAuthOr401(request);
  if (auth.response) return auth.response;
  const limited = await enforceUserRateLimit(auth.user.id, 'arenaMembership');
  if (limited) return limited;
  const admin = getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: 'Server unavailable' }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const inviteCode = typeof body.inviteCode === 'string' ? body.inviteCode.trim().toUpperCase() : '';
  if (!inviteCode) return NextResponse.json({ error: 'Invalid invite code' }, { status: 400 });
  const { data: group } = await admin.from('groups').select('id, name').eq('invite_code', inviteCode).maybeSingle();
  if (!group) return NextResponse.json({ error: 'Playgroup not found' }, { status: 404 });

  const { error } = await admin.from('group_members').insert({ group_id: group.id, user_id: auth.user.id });
  if (error && error.code !== '23505') return NextResponse.json({ error: 'Could not join playgroup' }, { status: 500 });
  if (error?.code !== '23505') {
    const [{ data: members }, { data: profile }] = await Promise.all([
      admin.from('group_members').select('user_id').eq('group_id', group.id).neq('user_id', auth.user.id),
      admin.from('profiles').select('username, display_name').eq('id', auth.user.id).single(),
    ]);
    const name = profile?.display_name || profile?.username || 'Un giocatore';
    await notifyUsers(admin, (members ?? []).map((row) => row.user_id), {
      type: 'arena_member_joined',
      content: {
        it: { title: 'Nuovo membro nel playgroup', body: `${name} si è unito a ${group.name}` },
        en: { title: 'New playgroup member', body: `${name} joined ${group.name}` },
      },
      data: { groupId: group.id, memberId: auth.user.id },
    }, { persist: false });
  }
  return NextResponse.json({ group });
}
