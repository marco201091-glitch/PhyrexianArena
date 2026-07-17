import { NextResponse } from 'next/server';
import { requireAuthOr401 } from '@/app/api/_lib/require-auth';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { createGuestSecret, hashGuestSecret } from '@/lib/live-game-guest';
import { enforceUserRateLimit } from '@/lib/api-rate-limit';

export async function POST(request: Request) {
  const auth = await requireAuthOr401(request);
  if (auth.response) return auth.response;
  const limited = await enforceUserRateLimit(auth.user.id, 'guestLobbyCreate');
  if (limited) return limited;
  const admin = getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: 'Server unavailable' }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const groupId = typeof body.groupId === 'string' ? body.groupId : '';
  const { data: membership } = await admin.from('group_members').select('id').eq('group_id', groupId).eq('user_id', auth.user.id).maybeSingle();
  const { data: group } = await admin.from('groups').select('created_by').eq('id', groupId).maybeSingle();
  if (!membership && group?.created_by !== auth.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const token = createGuestSecret();
  const { data, error } = await admin.from('live_game_lobbies').insert({
    group_id: groupId,
    created_by: auth.user.id,
    invite_token_hash: hashGuestSecret(token),
  }).select('id, expires_at, realtime_topic').single();
  if (error) return NextResponse.json({ error: 'Lobby creation failed' }, { status: 500 });
  return NextResponse.json({ ...data, token });
}

export async function GET(request: Request) {
  const auth = await requireAuthOr401(request);
  if (auth.response) return auth.response;
  const admin = getSupabaseAdminClient();
  const lobbyId = new URL(request.url).searchParams.get('id');
  if (!admin || !lobbyId) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const { data: lobby } = await admin.from('live_game_lobbies').select('id, group_id, live_game_id, expires_at, realtime_topic, closed_at').eq('id', lobbyId).eq('created_by', auth.user.id).maybeSingle();
  if (!lobby) return NextResponse.json({ error: 'Lobby not found' }, { status: 404 });
  const { data: guests } = await admin.from('live_game_lobby_guests').select('id, ready, joined_at, guest_id, guest_deck_id, arena_guests(display_name), arena_guest_decks(name, commander, commander_image, color_identity)').eq('lobby_id', lobbyId).is('revoked_at', null).order('joined_at');
  return NextResponse.json({ lobby, guests: guests ?? [] });
}

export async function PATCH(request: Request) {
  const auth = await requireAuthOr401(request);
  if (auth.response) return auth.response;
  const admin = getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: 'Server unavailable' }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  if (typeof body.lobbyId !== 'string') return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const { data: lobby } = await admin.from('live_game_lobbies')
    .select('group_id')
    .eq('id', body.lobbyId)
    .eq('created_by', auth.user.id)
    .maybeSingle();
  if (!lobby) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (body.action === 'rotate') {
    const token = createGuestSecret();
    const { error } = await admin.from('live_game_lobbies')
      .update({ invite_token_hash: hashGuestSecret(token) })
      .eq('id', body.lobbyId);
    if (error) return NextResponse.json({ error: 'QR rotation failed' }, { status: 500 });
    return NextResponse.json({ ok: true, token });
  }

  if (body.action === 'remove') {
    if (typeof body.guestSessionId !== 'string') return NextResponse.json({ error: 'Invalid guest' }, { status: 400 });
    const { error } = await admin.from('live_game_lobby_guests')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', body.guestSessionId)
      .eq('lobby_id', body.lobbyId);
    if (error) return NextResponse.json({ error: 'Guest removal failed' }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'close') {
    await admin.from('live_game_lobbies')
      .update({ closed_at: new Date().toISOString() })
      .eq('id', body.lobbyId);
    return NextResponse.json({ ok: true });
  }

  if (typeof body.liveGameId !== 'string') return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const { data: game } = await admin.from('live_games')
    .select('group_id, created_by')
    .eq('id', body.liveGameId)
    .maybeSingle();
  if (!game || lobby.group_id !== game.group_id || game.created_by !== auth.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { error } = await admin.from('live_game_lobbies').update({ live_game_id: body.liveGameId }).eq('id', body.lobbyId);
  if (error) return NextResponse.json({ error: 'Lobby link failed' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
