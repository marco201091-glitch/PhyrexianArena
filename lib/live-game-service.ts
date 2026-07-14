import {
  createEmptyLiveGameState,
  parseLiveGameState,
  type LiveGameRecord,
  type LiveGameState,
  type LiveGameStatus,
} from '@/lib/live-game';
import type { SupabaseClient } from '@supabase/supabase-js';

export async function fetchActiveLiveGame(
  supabase: SupabaseClient,
  groupId: string,
): Promise<LiveGameRecord | null> {
  const { data, error } = await supabase
    .from('live_games')
    .select('*')
    .eq('group_id', groupId)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    ...data,
    state: parseLiveGameState(data.state),
  } as LiveGameRecord;
}

export async function createLiveGame(
  supabase: SupabaseClient,
  input: {
    groupId: string;
    createdBy: string;
    startingLife: number;
    state: LiveGameState;
  },
): Promise<LiveGameRecord> {
  const { data, error } = await supabase
    .from('live_games')
    .insert({
      group_id: input.groupId,
      created_by: input.createdBy,
      starting_life: input.startingLife,
      status: 'active',
      state: input.state,
      started_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) throw error;

  return {
    ...data,
    state: parseLiveGameState(data.state),
  } as LiveGameRecord;
}

export async function updateLiveGameState(
  supabase: SupabaseClient,
  liveGameId: string,
  state: LiveGameState,
): Promise<LiveGameRecord> {
  const { data, error } = await supabase
    .from('live_games')
    .update({ state })
    .eq('id', liveGameId)
    .select('*')
    .single();

  if (error) throw error;

  return {
    ...data,
    state: parseLiveGameState(data.state),
  } as LiveGameRecord;
}

export async function setLiveGameStatus(
  supabase: SupabaseClient,
  liveGameId: string,
  status: LiveGameStatus,
  matchId?: string | null,
): Promise<void> {
  const payload: Record<string, unknown> = {
    status,
    ended_at: status === 'ended' || status === 'cancelled' ? new Date().toISOString() : null,
  };

  if (matchId !== undefined) {
    payload.match_id = matchId;
  }

  const { error } = await supabase
    .from('live_games')
    .update(payload)
    .eq('id', liveGameId);

  if (error) throw error;
}

export function subscribeToLiveGame(
  supabase: SupabaseClient,
  liveGameId: string,
  onChange: (record: LiveGameRecord) => void,
) {
  const channel = supabase
    .channel(`live-game:${liveGameId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'live_games',
        filter: `id=eq.${liveGameId}`,
      },
      (payload) => {
        const next = payload.new as LiveGameRecord;
        onChange({
          ...next,
          state: parseLiveGameState(next.state),
        });
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export async function cancelLiveGame(
  supabase: SupabaseClient,
  liveGameId: string,
): Promise<void> {
  await setLiveGameStatus(supabase, liveGameId, 'cancelled', null);
}

export async function finalizeLiveGameAsMatch(
  supabase: SupabaseClient,
  input: {
    groupId: string;
    createdBy: string;
    liveGameId: string;
    winnerKey: string | null;
    isDraw: boolean;
    players: Array<{
      participantKey: string;
      deckId: string;
      isGuest: boolean;
      userId: string | null;
      guestId: string | null;
    }>;
  },
): Promise<string> {
  const winnerParsed = input.winnerKey?.includes(':') ? input.winnerKey.split(':') : null;
  const winnerType = winnerParsed?.[0];
  const winnerId = winnerParsed?.[1] ?? null;

  const { data: match, error: matchError } = await supabase
    .from('matches')
    .insert({
      group_id: input.groupId,
      created_by: input.createdBy,
      is_draw: input.isDraw,
      winner_id: !input.isDraw && winnerType === 'user' ? winnerId : null,
      winner_guest_id: !input.isDraw && winnerType === 'guest' ? winnerId : null,
      played_at: new Date().toISOString(),
      notes: null,
    })
    .select('id')
    .single();

  if (matchError) throw matchError;

  const participants = input.players.map((player) => ({
    match_id: match.id,
    user_id: player.isGuest ? null : player.userId,
    guest_id: player.isGuest ? player.guestId : null,
    deck_id: player.isGuest ? null : player.deckId,
    guest_deck_id: player.isGuest ? player.deckId : null,
    is_winner: !input.isDraw && player.participantKey === input.winnerKey,
  }));

  const { error: participantsError } = await supabase
    .from('match_participants')
    .insert(participants);

  if (participantsError) {
    await supabase.from('matches').delete().eq('id', match.id);
    throw participantsError;
  }

  const guestIds = input.players.filter((player) => player.isGuest).map((player) => player.guestId!);
  if (guestIds.length > 0) {
    await supabase
      .from('arena_guests')
      .update({ last_played_at: new Date().toISOString() })
      .in('id', guestIds);
  }

  await setLiveGameStatus(supabase, input.liveGameId, 'ended', match.id);
  return match.id;
}