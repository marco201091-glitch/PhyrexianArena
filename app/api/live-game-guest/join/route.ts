import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { createGuestSecret, createRecoveryCode, hashGuestSecret, normalizeGuestDisplayName } from '@/lib/live-game-guest';
import { enforceIpRateLimit } from '@/lib/api-rate-limit';
import { REMOTE_GUESTS_ENABLED } from '@/lib/feature-flags';

export async function POST(request: Request) {
  if (!REMOTE_GUESTS_ENABLED) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const limited = await enforceIpRateLimit(request, 'guestLobbyJoin');
  if (limited) return limited;
  const admin = getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: 'Server unavailable' }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const token = typeof body.token === 'string' ? body.token : '';
  const displayName = normalizeGuestDisplayName(body.displayName);
  const commander = typeof body.commander === 'string' ? body.commander.trim().slice(0, 120) : '';
  const deckName = typeof body.deckName === 'string' ? body.deckName.trim().slice(0, 80) : '';
  if (!/^[a-f0-9]{48}$/.test(token) || !displayName || !commander) return NextResponse.json({ error: 'Invalid guest data' }, { status: 400 });
  const { data: lobby } = await admin.from('live_game_lobbies').select('id, group_id, expires_at').eq('invite_token_hash', hashGuestSecret(token)).gt('expires_at', new Date().toISOString()).maybeSingle();
  if (!lobby) return NextResponse.json({ error: 'Invite expired' }, { status: 404 });
  const normalizedName = displayName.toLocaleLowerCase('it').normalize('NFKC');
  let { data: guest } = await admin.from('arena_guests').select('id').eq('group_id', lobby.group_id).eq('normalized_name', normalizedName).maybeSingle();
  if (!guest) {
    const created = await admin.from('arena_guests').insert({ group_id: lobby.group_id, display_name: displayName, normalized_name: normalizedName }).select('id').single();
    if (created.error) return NextResponse.json({ error: 'Guest creation failed' }, { status: 500 });
    guest = created.data;
  }
  const { data: existing } = await admin.from('live_game_lobby_guests')
    .select('id')
    .eq('lobby_id', lobby.id)
    .eq('guest_id', guest.id)
    .is('revoked_at', null)
    .maybeSingle();
  if (existing) return NextResponse.json({ error: 'This guest already joined. Use session recovery.' }, { status: 409 });
  const deck = await admin.from('arena_guest_decks').insert({
    group_id: lobby.group_id,
    guest_id: guest.id,
    name: deckName || commander,
    commander,
    commander_image: typeof body.commanderImage === 'string' && /^https:\/\/[^ ]+$/i.test(body.commanderImage)
      ? body.commanderImage.slice(0, 500)
      : null,
    color_identity: Array.isArray(body.colorIdentity) ? body.colorIdentity.filter((entry: unknown) => typeof entry === 'string').slice(0, 5) : [],
  }).select('id').single();
  if (deck.error) return NextResponse.json({ error: 'Deck creation failed' }, { status: 500 });
  const sessionToken = createGuestSecret();
  const recoveryCode = createRecoveryCode();
  const joined = await admin.from('live_game_lobby_guests').insert({
    lobby_id: lobby.id,
    guest_id: guest.id,
    guest_deck_id: deck.data.id,
    session_token_hash: hashGuestSecret(sessionToken),
    recovery_code_hash: hashGuestSecret(recoveryCode),
  }).select('id').single();
  if (joined.error) {
    await admin.from('arena_guest_decks').delete().eq('id', deck.data.id);
    return NextResponse.json({ error: 'This guest already joined' }, { status: 409 });
  }
  return NextResponse.json({ sessionToken, recoveryCode, lobbyGuestId: joined.data.id });
}
