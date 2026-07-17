import { NextResponse } from 'next/server';
import { applyLiveGameMutation, parseLiveGameState } from '@/lib/live-game';
import { createGuestSecret, hashGuestSecret, parseGuestMutation } from '@/lib/live-game-guest';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { enforceIpRateLimit } from '@/lib/api-rate-limit';

async function findSession(sessionToken: string) {
  const admin = getSupabaseAdminClient();
  if (!admin || !/^[a-f0-9]{48}$/.test(sessionToken)) return null;
  const { data } = await admin.from('live_game_lobby_guests')
    .select('id, ready, guest_id, guest_deck_id, lobby_id, live_game_lobbies(live_game_id, expires_at), arena_guests(display_name), arena_guest_decks(name, commander, commander_image, color_identity)')
    .eq('session_token_hash', hashGuestSecret(sessionToken))
    .is('revoked_at', null)
    .maybeSingle();
  return data;
}

export async function GET(request: Request) {
  const limited = await enforceIpRateLimit(request, 'guestLobbySession');
  if (limited) return limited;
  const admin = getSupabaseAdminClient();
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const session = await findSession(token);
  if (!admin || !session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  const lobby = session.live_game_lobbies as unknown as { live_game_id: string | null; expires_at: string };
  if (new Date(lobby.expires_at) <= new Date()) return NextResponse.json({ error: 'Session expired' }, { status: 410 });
  let game = null;
  if (lobby.live_game_id) {
    const result = await admin.from('live_games').select('*').eq('id', lobby.live_game_id).maybeSingle();
    game = result.data;
  }
  return NextResponse.json({ session, game });
}

export async function PATCH(request: Request) {
  const limited = await enforceIpRateLimit(request, 'guestLobbySession');
  if (limited) return limited;
  const admin = getSupabaseAdminClient();
  const body = await request.json().catch(() => ({}));
  const session = await findSession(typeof body.sessionToken === 'string' ? body.sessionToken : '');
  if (!admin || !session || typeof body.ready !== 'boolean') return NextResponse.json({ error: 'Invalid session' }, { status: 400 });
  await admin.from('live_game_lobby_guests').update({ ready: body.ready }).eq('id', session.id);
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  const limited = await enforceIpRateLimit(request, 'guestLobbySession');
  if (limited) return limited;
  const admin = getSupabaseAdminClient();
  const body = await request.json().catch(() => ({}));
  const sessionToken = typeof body.sessionToken === 'string' ? body.sessionToken : '';
  const session = await findSession(sessionToken);
  if (!admin || !session) return NextResponse.json({ error: 'Invalid session' }, { status: 400 });
  const lobby = session.live_game_lobbies as unknown as { live_game_id: string | null };
  if (!lobby.live_game_id) return NextResponse.json({ error: 'Game not started' }, { status: 409 });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const current = await admin.from('live_games').select('*').eq('id', lobby.live_game_id).single();
    if (current.error) return NextResponse.json({ error: 'Game unavailable' }, { status: 404 });
    const state = parseLiveGameState(current.data.state);
    const mutation = parseGuestMutation(body.mutation, state);
    if (!mutation) return NextResponse.json({ error: 'Invalid mutation' }, { status: 400 });
    const nextState = applyLiveGameMutation(state, {
      ...mutation,
      eventId: crypto.randomUUID(),
      occurredAt: new Date().toISOString(),
    });
    const { data, error } = await admin.rpc('apply_guest_live_game_state', {
      p_session_token_hash: hashGuestSecret(sessionToken),
      p_expected_version: state.version,
      p_next_state: nextState,
    });
    if (error) return NextResponse.json({ error: 'Mutation failed' }, { status: 409 });
    const result = data as { applied?: boolean } | null;
    if (result?.applied !== false) return NextResponse.json(data);
  }
  return NextResponse.json({ error: 'Game changed. Retry.' }, { status: 409 });
}

export async function PUT(request: Request) {
  const limited = await enforceIpRateLimit(request, 'guestLobbyRecovery');
  if (limited) return limited;
  const admin = getSupabaseAdminClient();
  const body = await request.json().catch(() => ({}));
  const recoveryCode = typeof body.recoveryCode === 'string' ? body.recoveryCode.trim().toUpperCase() : '';
  const inviteToken = typeof body.inviteToken === 'string' ? body.inviteToken : '';
  if (!admin || recoveryCode.length < 8 || !/^[a-f0-9]{48}$/.test(inviteToken)) {
    return NextResponse.json({ error: 'Invalid recovery data' }, { status: 400 });
  }
  const { data: lobby } = await admin.from('live_game_lobbies')
    .select('id')
    .eq('invite_token_hash', hashGuestSecret(inviteToken))
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  if (!lobby) return NextResponse.json({ error: 'Invite expired' }, { status: 404 });
  const sessionToken = createGuestSecret();
  const { data, error } = await admin.from('live_game_lobby_guests')
    .update({ session_token_hash: hashGuestSecret(sessionToken) })
    .eq('lobby_id', lobby.id)
    .eq('recovery_code_hash', hashGuestSecret(recoveryCode))
    .is('revoked_at', null)
    .select('id')
    .maybeSingle();
  if (error || !data) return NextResponse.json({ error: 'Recovery code not found' }, { status: 404 });
  return NextResponse.json({ sessionToken });
}
