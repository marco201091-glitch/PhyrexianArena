import { NextResponse } from 'next/server';
import { applyLiveGameMutation, parseLiveGameState, type LiveGameState } from '@/lib/live-game';
import {
  createGuestSecret,
  createRecoveryCode,
  hashGuestSecret,
  normalizeGuestDisplayName,
  parseGuestMutation,
} from '@/lib/live-game-guest';
import { enforceIpRateLimit } from '@/lib/api-rate-limit';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { REMOTE_GUESTS_ENABLED } from '@/lib/feature-flags';

const TOKEN_RE = /^[a-f0-9]{48}$/;

async function findAccess(rawToken: string) {
  const admin = getSupabaseAdminClient();
  if (!admin || !TOKEN_RE.test(rawToken)) return null;
  const hash = hashGuestSecret(rawToken);
  const { data: host } = await admin.from('public_counter_sessions')
    .select('*')
    .eq('host_session_hash', hash)
    .is('closed_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  if (host) return { role: 'host' as const, session: host, guest: null };
  const { data: guest } = await admin.from('public_counter_guests')
    .select('*, public_counter_sessions(*)')
    .eq('guest_session_hash', hash)
    .is('revoked_at', null)
    .maybeSingle();
  const session = guest?.public_counter_sessions as unknown as Record<string, unknown> | null;
  if (!guest || !session || session.closed_at || new Date(String(session.expires_at)) <= new Date()) return null;
  return { role: 'guest' as const, session, guest };
}

async function sessionPayload(access: NonNullable<Awaited<ReturnType<typeof findAccess>>>) {
  const admin = getSupabaseAdminClient()!;
  const { data: guests } = await admin.from('public_counter_guests')
    .select('id, display_name, deck_name, commander, commander_image, color_identity, ready, joined_at')
    .eq('session_id', access.session.id)
    .is('revoked_at', null)
    .order('joined_at');
  return {
    role: access.role,
    guestId: access.guest?.id ?? null,
    session: {
      id: access.session.id,
      format: access.session.format,
      state: access.session.state ? parseLiveGameState(access.session.state) : null,
      startedAt: access.session.started_at,
      expiresAt: access.session.expires_at,
      realtimeTopic: access.session.realtime_topic,
    },
    guests: guests ?? [],
  };
}

export async function GET(request: Request) {
  if (!REMOTE_GUESTS_ENABLED) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const limited = await enforceIpRateLimit(request, 'publicCounterSession');
  if (limited) return limited;
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const access = await findAccess(token);
  if (!access) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  return NextResponse.json(await sessionPayload(access), {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

export async function POST(request: Request) {
  if (!REMOTE_GUESTS_ENABLED) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  const action = typeof body.action === 'string' ? body.action : '';
  const rateScope = action === 'create'
    ? 'publicCounterCreate'
    : action === 'join' ? 'publicCounterJoin' : 'publicCounterSession';
  const limited = await enforceIpRateLimit(request, rateScope);
  if (limited) return limited;
  const admin = getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: 'Server unavailable' }, { status: 503 });

  if (action === 'create') {
    if (body.format !== 'commander' && body.format !== 'classic') {
      return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
    }
    const inviteToken = createGuestSecret();
    const hostToken = createGuestSecret();
    const realtimeTopic = createGuestSecret();
    const { data, error } = await admin.from('public_counter_sessions').insert({
      invite_token_hash: hashGuestSecret(inviteToken),
      host_session_hash: hashGuestSecret(hostToken),
      realtime_topic: realtimeTopic,
      format: body.format,
    }).select('id, expires_at').single();
    if (error) return NextResponse.json({ error: 'Session creation failed' }, { status: 500 });
    return NextResponse.json({ ...data, inviteToken, hostToken, realtimeTopic });
  }

  if (action === 'join') {
    const inviteToken = typeof body.inviteToken === 'string' ? body.inviteToken : '';
    const displayName = normalizeGuestDisplayName(body.displayName);
    const commander = typeof body.commander === 'string' ? body.commander.trim().slice(0, 120) : '';
    const deckName = typeof body.deckName === 'string' ? body.deckName.trim().slice(0, 80) : '';
    if (!TOKEN_RE.test(inviteToken) || !displayName) {
      return NextResponse.json({ error: 'Invalid guest data' }, { status: 400 });
    }
    const { data: session } = await admin.from('public_counter_sessions')
      .select('id, format')
      .eq('invite_token_hash', hashGuestSecret(inviteToken))
      .is('closed_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    if (!session) return NextResponse.json({ error: 'Invite expired' }, { status: 404 });
    const resolvedCommander = session.format === 'classic' ? 'Magic' : commander;
    if (!resolvedCommander) return NextResponse.json({ error: 'Commander required' }, { status: 400 });
    const guestToken = createGuestSecret();
    const recoveryCode = createRecoveryCode();
    const commanderImage = typeof body.commanderImage === 'string' && /^https:\/\/[^ ]+$/i.test(body.commanderImage)
      ? body.commanderImage.slice(0, 500)
      : null;
    const { data, error } = await admin.from('public_counter_guests').insert({
      session_id: session.id,
      display_name: displayName,
      deck_name: deckName || resolvedCommander,
      commander: resolvedCommander,
      commander_image: commanderImage,
      color_identity: Array.isArray(body.colorIdentity)
        ? body.colorIdentity.filter((entry: unknown) => typeof entry === 'string').slice(0, 5)
        : [],
      guest_session_hash: hashGuestSecret(guestToken),
      recovery_code_hash: hashGuestSecret(recoveryCode),
    }).select('id').single();
    if (error) return NextResponse.json({ error: 'Guest already joined' }, { status: 409 });
    return NextResponse.json({ guestToken, recoveryCode, guestId: data.id });
  }

  const rawToken = typeof body.sessionToken === 'string' ? body.sessionToken : '';
  const access = await findAccess(rawToken);
  if (!access) return NextResponse.json({ error: 'Invalid session' }, { status: 400 });

  if (action === 'start') {
    if (access.role !== 'host') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const state = parseLiveGameState(body.state);
    if (state.players.length < 1 || state.players.length > 6) {
      return NextResponse.json({ error: 'Invalid state' }, { status: 400 });
    }
    const { error } = await admin.from('public_counter_sessions').update({
      state,
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', access.session.id);
    if (error) return NextResponse.json({ error: 'Session start failed' }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === 'mutate') {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const { data: current } = await admin.from('public_counter_sessions')
        .select('state, updated_at')
        .eq('id', access.session.id)
        .single();
      if (!current?.state) return NextResponse.json({ error: 'Counter not started' }, { status: 409 });
      const state = parseLiveGameState(current.state);
      const mutation = parseGuestMutation(body.mutation, state);
      if (!mutation) return NextResponse.json({ error: 'Invalid mutation' }, { status: 400 });
      const next: LiveGameState = applyLiveGameMutation(state, {
        ...mutation,
        eventId: crypto.randomUUID(),
        occurredAt: new Date().toISOString(),
      });
      const now = new Date().toISOString();
      const { data: updated, error } = await admin.from('public_counter_sessions').update({
        state: next,
        updated_at: now,
      }).eq('id', access.session.id).eq('updated_at', current.updated_at).select('id').maybeSingle();
      if (error) return NextResponse.json({ error: 'Mutation failed' }, { status: 409 });
      if (updated) return NextResponse.json({ applied: true, state: next });
    }
    return NextResponse.json({ error: 'Counter changed. Retry.' }, { status: 409 });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

export async function PATCH(request: Request) {
  if (!REMOTE_GUESTS_ENABLED) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const limited = await enforceIpRateLimit(request, 'publicCounterSession');
  if (limited) return limited;
  const admin = getSupabaseAdminClient();
  const body = await request.json().catch(() => ({}));
  const access = await findAccess(typeof body.sessionToken === 'string' ? body.sessionToken : '');
  if (!admin || !access) return NextResponse.json({ error: 'Invalid session' }, { status: 400 });

  if (body.action === 'ready' && access.role === 'guest' && typeof body.ready === 'boolean') {
    await admin.from('public_counter_guests').update({ ready: body.ready }).eq('id', access.guest.id);
    return NextResponse.json({ ok: true });
  }
  if (body.action === 'remove' && access.role === 'host' && typeof body.guestId === 'string') {
    await admin.from('public_counter_guests').update({ revoked_at: new Date().toISOString() })
      .eq('id', body.guestId).eq('session_id', access.session.id);
    return NextResponse.json({ ok: true });
  }
  if (body.action === 'rotate' && access.role === 'host') {
    const inviteToken = createGuestSecret();
    await admin.from('public_counter_sessions').update({
      invite_token_hash: hashGuestSecret(inviteToken),
    }).eq('id', access.session.id);
    return NextResponse.json({ inviteToken });
  }
  if (body.action === 'recover') {
    return NextResponse.json({ error: 'Use recovery endpoint' }, { status: 400 });
  }
  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

export async function PUT(request: Request) {
  if (!REMOTE_GUESTS_ENABLED) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const limited = await enforceIpRateLimit(request, 'guestLobbyRecovery');
  if (limited) return limited;
  const admin = getSupabaseAdminClient();
  const body = await request.json().catch(() => ({}));
  const inviteToken = typeof body.inviteToken === 'string' ? body.inviteToken : '';
  const recoveryCode = typeof body.recoveryCode === 'string' ? body.recoveryCode.trim().toUpperCase() : '';
  if (!admin || !TOKEN_RE.test(inviteToken) || recoveryCode.length < 8) {
    return NextResponse.json({ error: 'Invalid recovery data' }, { status: 400 });
  }
  const { data: session } = await admin.from('public_counter_sessions').select('id')
    .eq('invite_token_hash', hashGuestSecret(inviteToken))
    .is('closed_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  if (!session) return NextResponse.json({ error: 'Invite expired' }, { status: 404 });
  const guestToken = createGuestSecret();
  const { data } = await admin.from('public_counter_guests')
    .update({ guest_session_hash: hashGuestSecret(guestToken) })
    .eq('session_id', session.id)
    .eq('recovery_code_hash', hashGuestSecret(recoveryCode))
    .is('revoked_at', null)
    .select('id')
    .maybeSingle();
  if (!data) return NextResponse.json({ error: 'Recovery code not found' }, { status: 404 });
  return NextResponse.json({ guestToken });
}

export async function DELETE(request: Request) {
  if (!REMOTE_GUESTS_ENABLED) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const limited = await enforceIpRateLimit(request, 'publicCounterSession');
  if (limited) return limited;
  const admin = getSupabaseAdminClient();
  const body = await request.json().catch(() => ({}));
  const access = await findAccess(typeof body.sessionToken === 'string' ? body.sessionToken : '');
  if (!admin || !access || access.role !== 'host') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  await admin.from('public_counter_sessions').update({
    closed_at: new Date().toISOString(),
    expires_at: new Date().toISOString(),
  }).eq('id', access.session.id);
  return NextResponse.json({ ok: true });
}
