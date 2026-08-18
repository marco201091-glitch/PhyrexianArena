import { createHash, randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { requireAuthOr401 } from '@/app/api/_lib/require-auth';
import { enforceIpRateLimit, enforceUserRateLimit } from '@/lib/api-rate-limit';
import { getAuthSiteUrl } from '@/lib/auth-site-url';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { notifyUsers } from '@/lib/push-notifications-server';

const TOKEN_RE = /^[a-f0-9]{64}$/;

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function GET(request: Request) {
  const limited = await enforceIpRateLimit(request, 'guestClaimPreview');
  if (limited) return limited;
  const token = new URL(request.url).searchParams.get('token') ?? '';
  if (!TOKEN_RE.test(token)) return NextResponse.json({ error: 'Invalid link' }, { status: 400 });
  const admin = getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: 'Server unavailable' }, { status: 503 });

  const { data } = await admin
    .from('arena_guest_claim_links')
    .select('expires_at, arena_guests(display_name, arena_guest_decks(name, commander, commander_image)), groups(name)')
    .eq('token_hash', hashToken(token))
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (!data) return NextResponse.json({ error: 'Link expired or already used' }, { status: 404 });
  const guest = Array.isArray(data.arena_guests) ? data.arena_guests[0] : data.arena_guests;
  const group = Array.isArray(data.groups) ? data.groups[0] : data.groups;
  return NextResponse.json({
    guest: {
      displayName: guest?.display_name,
      decks: guest?.arena_guest_decks ?? [],
    },
    arenaName: group?.name,
    expiresAt: data.expires_at,
  });
}

export async function POST(request: Request) {
  const auth = await requireAuthOr401(request);
  if (auth.response) return auth.response;
  const limited = await enforceUserRateLimit(auth.user.id, 'guestClaimCreate');
  if (limited) return limited;
  const admin = getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: 'Server unavailable' }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const guestId = typeof body.guestId === 'string' ? body.guestId : '';
  if (!/^[0-9a-f-]{36}$/i.test(guestId)) return NextResponse.json({ error: 'Invalid guest' }, { status: 400 });

  const { data: guest } = await admin
    .from('arena_guests')
    .select('id, group_id, display_name, groups(created_by)')
    .eq('id', guestId)
    .maybeSingle();
  const group = Array.isArray(guest?.groups) ? guest.groups[0] : guest?.groups;
  if (!guest || group?.created_by !== auth.user.id) {
    return NextResponse.json({ error: 'Only the Arena manager can create this link' }, { status: 403 });
  }

  const { error: revokeError } = await admin
    .from('arena_guest_claim_links')
    .delete()
    .eq('guest_id', guest.id);
  if (revokeError) return NextResponse.json({ error: 'Could not refresh guest link' }, { status: 500 });

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await admin.from('arena_guest_claim_links').insert({
    guest_id: guest.id,
    group_id: guest.group_id,
    token_hash: hashToken(token),
    created_by: auth.user.id,
    expires_at: expiresAt,
  });
  if (error) {
    console.error('Guest claim link insert failed:', error.code);
    return NextResponse.json({ error: 'Could not create guest upgrade link' }, { status: 500 });
  }

  const path = `/guest/claim/${token}`;
  return NextResponse.json({
    url: `${getAuthSiteUrl(request)}${path}`,
    path,
    expiresAt,
    guestName: guest.display_name,
  });
}

export async function PATCH(request: Request) {
  const auth = await requireAuthOr401(request);
  if (auth.response) return auth.response;
  const limited = await enforceUserRateLimit(auth.user.id, 'guestClaimCreate');
  if (limited) return limited;
  const token = String((await request.json().catch(() => ({}))).token ?? '');
  if (!TOKEN_RE.test(token)) return NextResponse.json({ error: 'Invalid link' }, { status: 400 });
  const admin = getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: 'Server unavailable' }, { status: 503 });

  // The RPC reads auth.uid(), so call it with the user's bearer token instead
  // of the service-role client.
  const authorization = request.headers.get('authorization') ?? '';
  const { createClient } = await import('@supabase/supabase-js');
  const { getSupabaseServerAnonKey, getSupabaseServerUrl } = await import('@/lib/supabase/server-env');
  const url = getSupabaseServerUrl();
  const anonKey = getSupabaseServerAnonKey();
  if (!url || !anonKey) return NextResponse.json({ error: 'Server unavailable' }, { status: 503 });
  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await userClient.rpc('claim_arena_guest', { p_token_hash: hashToken(token) });
  if (error) {
    const conflict = error.code === '23505' || error.code === '55000';
    return NextResponse.json({ error: error.message }, { status: conflict ? 409 : 400 });
  }
  const result = data as { groupId?: string; groupName?: string; displayName?: string };
  if (result.groupId) {
    const { data: members } = await admin.from('group_members').select('user_id').eq('group_id', result.groupId).neq('user_id', auth.user.id);
    await notifyUsers(admin, (members ?? []).map((row) => row.user_id), {
      type: 'arena_member_joined',
      content: {
        it: { title: 'Nuovo membro nell’Arena', body: `${result.displayName || 'Un giocatore'} si è unito a ${result.groupName || 'un’Arena'}` },
        en: { title: 'New Arena member', body: `${result.displayName || 'A player'} joined ${result.groupName || 'an Arena'}` },
      },
      data: { groupId: result.groupId, memberId: auth.user.id },
    }, { persist: false });
  }
  return NextResponse.json(data);
}
