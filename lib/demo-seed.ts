import type { SupabaseClient } from '@supabase/supabase-js';
import { DEMO_ACCOUNT_EMAIL } from '@/lib/demo';
import { resolveCommanderImage } from '@/lib/demo-commander-images';

export interface DemoSeedResult {
  demoUserId: string;
  arenaId: string;
  inviteCode: string;
}

function normalizeGuestName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

async function withCommanderImage<T extends { commander: string; commander_image?: string | null }>(deck: T) {
  const commander_image = await resolveCommanderImage(deck.commander);
  return { ...deck, commander_image };
}

export async function findDemoUserId(admin: SupabaseClient, email = DEMO_ACCOUNT_EMAIL) {
  const normalizedEmail = email.trim().toLowerCase();
  let page = 1;

  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;

    const match = data.users.find((user) => user.email?.toLowerCase() === normalizedEmail);
    if (match) return match.id;

    if (data.users.length < 200) break;
    page += 1;
  }

  return null;
}

export async function wipeDemoUserData(admin: SupabaseClient, demoUserId: string) {
  await admin.from('groups').delete().eq('created_by', demoUserId);
  await admin.from('decks').delete().eq('user_id', demoUserId);
  await admin.from('group_members').delete().eq('user_id', demoUserId);

  const { data: avatarFiles } = await admin.storage.from('avatars').list(demoUserId);
  if (avatarFiles?.length) {
    await admin.storage
      .from('avatars')
      .remove(avatarFiles.map((file) => `${demoUserId}/${file.name}`));
  }

  await admin
    .from('profiles')
    .update({ display_name: 'Demo Player' })
    .eq('id', demoUserId);
}

export async function seedDemoTemplate(
  admin: SupabaseClient,
  demoUserId: string,
): Promise<DemoSeedResult> {
  const { data: arena, error: arenaError } = await admin
    .from('groups')
    .insert({
      name: 'Arena Demo Phyrexian',
      description: 'Sandbox di prova: crea partite, mazzi e ospiti. I dati vengono resettati periodicamente.',
      created_by: demoUserId,
      is_public: true,
    })
    .select('id, invite_code')
    .single();

  if (arenaError || !arena) {
    throw arenaError ?? new Error('Failed to create demo arena');
  }

  const globalDecks = await Promise.all([
    withCommanderImage({
      user_id: demoUserId,
      group_id: null,
      name: 'Superfriends',
      commander: 'Atraxa, Praetors\' Voice',
      color_identity: ['W', 'U', 'B', 'G'],
      bracket: '3',
    }),
    withCommanderImage({
      user_id: demoUserId,
      group_id: null,
      name: 'Vampiri',
      commander: 'Edgar Markov',
      color_identity: ['W', 'B', 'R'],
      bracket: '3',
    }),
  ]);

  const { error: globalDeckError } = await admin.from('decks').insert(globalDecks);
  if (globalDeckError) throw globalDeckError;

  const { data: arenaDeck, error: arenaDeckError } = await admin
    .from('decks')
    .insert(await withCommanderImage({
      user_id: demoUserId,
      group_id: arena.id,
      name: 'Tokens & Taxes',
      commander: 'Grand Arbiter Augustin IV',
      color_identity: ['W', 'U'],
      bracket: '3',
    }))
    .select('id')
    .single();

  if (arenaDeckError || !arenaDeck) {
    throw arenaDeckError ?? new Error('Failed to create demo arena deck');
  }

  const guests = [
    { display_name: 'Ophidian', normalized_name: normalizeGuestName('Ophidian') },
    { display_name: 'Venser', normalized_name: normalizeGuestName('Venser') },
  ];

  const { data: guestRows, error: guestError } = await admin
    .from('arena_guests')
    .insert(guests.map((guest) => ({ ...guest, group_id: arena.id })))
    .select('id, display_name');

  if (guestError || !guestRows?.length) {
    throw guestError ?? new Error('Failed to create demo guests');
  }

  const ophidian = guestRows.find((guest) => guest.display_name === 'Ophidian');
  const venser = guestRows.find((guest) => guest.display_name === 'Venser');

  if (!ophidian || !venser) {
    throw new Error('Demo guest seed was incomplete');
  }

  const { data: guestDecks, error: guestDeckError } = await admin
    .from('arena_guest_decks')
    .insert(await Promise.all([
      withCommanderImage({
        guest_id: ophidian.id,
        group_id: arena.id,
        name: 'Slivers',
        commander: 'Sliver Overlord',
        color_identity: ['W', 'U', 'B', 'R', 'G'],
        bracket: '4',
      }),
      withCommanderImage({
        guest_id: venser.id,
        group_id: arena.id,
        name: 'Artifacts',
        commander: 'Urza, Lord High Artificer',
        color_identity: ['U'],
        bracket: '4',
      }),
    ]))
    .select('id, guest_id');

  if (guestDeckError || !guestDecks?.length) {
    throw guestDeckError ?? new Error('Failed to create demo guest decks');
  }

  const ophidianDeck = guestDecks.find((deck) => deck.guest_id === ophidian.id);
  const venserDeck = guestDecks.find((deck) => deck.guest_id === venser.id);

  if (!ophidianDeck || !venserDeck) {
    throw new Error('Demo guest deck seed was incomplete');
  }

  const now = Date.now();
  const matchSeeds = [
    {
      played_at: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
      winner_id: demoUserId,
      notes: 'Demo match #1',
    },
    {
      played_at: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
      winner_guest_id: ophidian.id,
      notes: 'Demo match #2',
    },
    {
      played_at: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
      winner_id: demoUserId,
      notes: 'Demo match #3',
    },
    {
      played_at: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
      winner_guest_id: venser.id,
      notes: 'Demo match #4',
    },
  ];

  for (const matchSeed of matchSeeds) {
    const { data: match, error: matchError } = await admin
      .from('matches')
      .insert({
        group_id: arena.id,
        created_by: demoUserId,
        played_at: matchSeed.played_at,
        winner_id: matchSeed.winner_id ?? null,
        winner_guest_id: matchSeed.winner_guest_id ?? null,
        notes: matchSeed.notes,
      })
      .select('id')
      .single();

    if (matchError || !match) {
      throw matchError ?? new Error('Failed to create demo match');
    }

    const participants = [
      {
        match_id: match.id,
        user_id: demoUserId,
        deck_id: arenaDeck.id,
        is_winner: matchSeed.winner_id === demoUserId,
      },
      {
        match_id: match.id,
        guest_id: ophidian.id,
        guest_deck_id: ophidianDeck.id,
        is_winner: matchSeed.winner_guest_id === ophidian.id,
      },
      {
        match_id: match.id,
        guest_id: venser.id,
        guest_deck_id: venserDeck.id,
        is_winner: matchSeed.winner_guest_id === venser.id,
      },
    ];

    const { error: participantError } = await admin.from('match_participants').insert(participants);
    if (participantError) throw participantError;
  }

  return {
    demoUserId,
    arenaId: arena.id,
    inviteCode: arena.invite_code,
  };
}

export async function resetAndSeedDemoAccount(
  admin: SupabaseClient,
  demoUserId: string,
): Promise<DemoSeedResult> {
  await wipeDemoUserData(admin, demoUserId);
  return seedDemoTemplate(admin, demoUserId);
}