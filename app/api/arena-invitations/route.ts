import { NextResponse } from 'next/server';
import { requireAuthOr401 } from '@/app/api/_lib/require-auth';
import { enforceUserRateLimit } from '@/lib/api-rate-limit';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { notifyUsers } from '@/lib/push-notifications-server';

async function requireManager(admin: NonNullable<ReturnType<typeof getSupabaseAdminClient>>, groupId: string, userId: string) {
  const { data } = await admin.from('groups').select('id, name, created_by').eq('id', groupId).maybeSingle();
  return data?.created_by === userId ? data : null;
}

export async function GET(request: Request) {
  const auth = await requireAuthOr401(request);
  if (auth.response) return auth.response;
  const limited = await enforceUserRateLimit(auth.user.id, 'arenaInvitation');
  if (limited) return limited;
  const admin = getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: 'Server unavailable' }, { status: 503 });
  const url = new URL(request.url);
  const groupId = url.searchParams.get('groupId') ?? '';
  const query = url.searchParams.get('q')?.trim() ?? '';

  if (groupId && query.length >= 2) {
    const group = await requireManager(admin, groupId, auth.user.id);
    if (!group) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { data: members } = await admin.from('group_members').select('user_id').eq('group_id', groupId);
    const excluded = new Set([auth.user.id, ...(members ?? []).map((row) => row.user_id)]);
    const escaped = query.replace(/[%_,]/g, '');
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, username, display_name')
      .or(`username.ilike.%${escaped}%,display_name.ilike.%${escaped}%`)
      .limit(12);
    return NextResponse.json({ users: (profiles ?? []).filter((profile) => !excluded.has(profile.id)).slice(0, 8) });
  }

  const { data } = await admin
    .from('arena_invitations')
    .select('id, group_id, created_at, groups(name), profiles!arena_invitations_invited_by_fkey(username, display_name)')
    .eq('invited_user_id', auth.user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  return NextResponse.json({ invitations: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireAuthOr401(request);
  if (auth.response) return auth.response;
  const limited = await enforceUserRateLimit(auth.user.id, 'arenaInvitation');
  if (limited) return limited;
  const admin = getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: 'Server unavailable' }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const groupId = typeof body.groupId === 'string' ? body.groupId : '';
  const invitedUserId = typeof body.userId === 'string' ? body.userId : '';
  const group = await requireManager(admin, groupId, auth.user.id);
  if (!group || !invitedUserId || invitedUserId === auth.user.id) return NextResponse.json({ error: 'Invalid invitation' }, { status: 400 });

  const { data: existingMember } = await admin
    .from('group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', invitedUserId)
    .maybeSingle();
  if (existingMember) return NextResponse.json({ error: 'User is already a member' }, { status: 409 });

  const { data: invitation, error } = await admin.from('arena_invitations').insert({
    group_id: groupId,
    invited_user_id: invitedUserId,
    invited_by: auth.user.id,
  }).select('id').single();
  if (error) {
    return NextResponse.json({ error: error.code === '23505' ? 'Invitation already pending' : 'Invitation failed' }, { status: error.code === '23505' ? 409 : 500 });
  }

  await notifyUsers(admin, [invitedUserId], {
    type: 'arena_invite',
    title: 'Invito al playgroup',
    body: `Sei stato invitato in ${group.name}`,
    data: { groupId, invitationId: invitation.id },
    dedupeKey: `arena_invite:${invitation.id}`,
  });
  return NextResponse.json({ invitationId: invitation.id });
}

export async function PATCH(request: Request) {
  const auth = await requireAuthOr401(request);
  if (auth.response) return auth.response;
  const limited = await enforceUserRateLimit(auth.user.id, 'arenaInvitation');
  if (limited) return limited;
  const admin = getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: 'Server unavailable' }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const invitationId = typeof body.invitationId === 'string' ? body.invitationId : '';
  const action = body.action === 'accept' ? 'accepted' : body.action === 'decline' ? 'declined' : null;
  if (!invitationId || !action) return NextResponse.json({ error: 'Invalid response' }, { status: 400 });
  const { data: invitation } = await admin
    .from('arena_invitations')
    .select('id, group_id, invited_user_id, status, groups(name)')
    .eq('id', invitationId)
    .eq('invited_user_id', auth.user.id)
    .eq('status', 'pending')
    .maybeSingle();
  if (!invitation) return NextResponse.json({ error: 'Invitation unavailable' }, { status: 404 });

  if (action === 'accepted') {
    const inserted = await admin.from('group_members').insert({ group_id: invitation.group_id, user_id: auth.user.id });
    if (inserted.error && inserted.error.code !== '23505') return NextResponse.json({ error: 'Could not join playgroup' }, { status: 500 });
  }
  await admin.from('arena_invitations').update({ status: action, responded_at: new Date().toISOString() }).eq('id', invitation.id);

  if (action === 'accepted') {
    const [{ data: members }, { data: profile }] = await Promise.all([
      admin.from('group_members').select('user_id').eq('group_id', invitation.group_id).neq('user_id', auth.user.id),
      admin.from('profiles').select('username, display_name').eq('id', auth.user.id).single(),
    ]);
    const group = Array.isArray(invitation.groups) ? invitation.groups[0] : invitation.groups;
    const name = profile?.display_name || profile?.username || 'Un giocatore';
    await notifyUsers(admin, (members ?? []).map((row) => row.user_id), {
      type: 'arena_member_joined',
      title: 'Nuovo membro nel playgroup',
      body: `${name} si è unito a ${group?.name ?? 'un playgroup'}`,
      data: { groupId: invitation.group_id, memberId: auth.user.id },
    }, { persist: false });
  }
  return NextResponse.json({ ok: true, groupId: invitation.group_id, status: action });
}
