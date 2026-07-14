import type { ParticipantKey } from '@/lib/participant-keys';
import type { TableLayoutVariant } from '@/lib/live-game-table-layout';

export const LIVE_GAME_MIN_PLAYERS = 2;
export const LIVE_GAME_MAX_PLAYERS = 6;
export const COMMANDER_DAMAGE_LIMIT = 21;
export const INFECT_LOSS_THRESHOLD = 10;

export type LiveGameStatus = 'setup' | 'active' | 'ended' | 'cancelled';
export type DamageMode = 'life' | 'commander' | 'infect';
export type PlayDirection = 'clockwise' | 'counterclockwise';
export type LiveGameEventType =
  | 'damage'
  | 'commander_damage'
  | 'infect'
  | 'lifegain'
  | 'elimination'
  | 'revive'
  | 'correction';

export interface LiveGameEvent {
  id: string;
  type: LiveGameEventType;
  occurredAt: string;
  targetKey: ParticipantKey;
  sourceKey: ParticipantKey | null;
  amount: number | null;
}

export interface LiveGamePlayer {
  slot: number;
  participantKey: ParticipantKey;
  deckId: string;
  displayName: string;
  commander: string;
  commanderImage: string | null;
  life: number;
  infect: number;
  commanderDamageFrom: Record<ParticipantKey, number>;
  isEliminated: boolean;
  eliminatedAt: string | null;
}

export interface LiveGameState {
  version: number;
  players: LiveGamePlayer[];
  layoutVariant?: TableLayoutVariant;
  startingPlayerKey?: ParticipantKey | null;
  startingDirection?: PlayDirection | null;
  events: LiveGameEvent[];
}

type LiveGameMutationMetadata = {
  eventId?: string;
  occurredAt?: string;
};

export type LiveGameMutation = (
  | {
      type: 'adjust';
      targetKey: ParticipantKey;
      amount: number;
      mode: DamageMode;
      sourceKey?: ParticipantKey;
    }
  | { type: 'eliminate'; targetKey: ParticipantKey; eliminatedAt: string }
  | { type: 'revive'; targetKey: ParticipantKey; startingLife: number }
  | { type: 'restore-player'; player: LiveGamePlayer }
) & LiveGameMutationMetadata;

export interface QueuedLiveGameMutation {
  id: string;
  mutation: LiveGameMutation;
}

export interface LiveGameRecord {
  id: string;
  group_id: string;
  created_by: string;
  status: LiveGameStatus;
  starting_life: number;
  state: LiveGameState;
  match_id: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

export function bumpLiveGameState(state: LiveGameState): LiveGameState {
  return { ...state, version: state.version + 1 };
}

export function createLiveGamePlayer(input: {
  slot: number;
  participantKey: ParticipantKey;
  deckId: string;
  displayName: string;
  commander: string;
  commanderImage: string | null;
  startingLife: number;
  allParticipantKeys: ParticipantKey[];
}): LiveGamePlayer {
  const commanderDamageFrom = Object.fromEntries(
    input.allParticipantKeys
      .filter((key) => key !== input.participantKey)
      .map((key) => [key, 0]),
  ) as Record<ParticipantKey, number>;

  return {
    slot: input.slot,
    participantKey: input.participantKey,
    deckId: input.deckId,
    displayName: input.displayName,
    commander: input.commander,
    commanderImage: input.commanderImage,
    life: input.startingLife,
    infect: 0,
    commanderDamageFrom,
    isEliminated: false,
    eliminatedAt: null,
  };
}

export function getActivePlayers(state: LiveGameState): LiveGamePlayer[] {
  return state.players.filter((player) => !player.isEliminated);
}

export function shouldAutoEliminate(player: LiveGamePlayer): boolean {
  if (player.life <= 0) return true;
  if (player.infect >= INFECT_LOSS_THRESHOLD) return true;
  return Object.values(player.commanderDamageFrom).some((damage) => damage >= COMMANDER_DAMAGE_LIMIT);
}

export function applyDamage(
  state: LiveGameState,
  targetKey: ParticipantKey,
  amount: number,
  mode: DamageMode,
  sourceKey?: ParticipantKey,
): LiveGameState {
  if (amount <= 0) return state;

  const players = state.players.map((player) => {
    if (player.participantKey !== targetKey || player.isEliminated) return player;

    if (mode === 'infect') {
      return { ...player, infect: player.infect + amount };
    }

    if (mode === 'commander') {
      if (!sourceKey || sourceKey === targetKey) return player;
      const current = player.commanderDamageFrom[sourceKey] ?? 0;
      return {
        ...player,
        life: player.life - amount,
        commanderDamageFrom: {
          ...player.commanderDamageFrom,
          [sourceKey]: current + amount,
        },
      };
    }

    return { ...player, life: player.life - amount };
  });

  return bumpLiveGameState({ ...state, players });
}

export function applyHealing(
  state: LiveGameState,
  targetKey: ParticipantKey,
  amount: number,
  mode: DamageMode,
  sourceKey?: ParticipantKey,
): LiveGameState {
  if (amount <= 0) return state;

  const players = state.players.map((player) => {
    if (player.participantKey !== targetKey || player.isEliminated) return player;

    if (mode === 'infect') {
      return { ...player, infect: Math.max(0, player.infect - amount) };
    }

    if (mode === 'commander') {
      if (!sourceKey || sourceKey === targetKey) return player;
      const current = player.commanderDamageFrom[sourceKey] ?? 0;
      return {
        ...player,
        life: player.life + amount,
        commanderDamageFrom: {
          ...player.commanderDamageFrom,
          [sourceKey]: Math.max(0, current - amount),
        },
      };
    }

    return { ...player, life: player.life + amount };
  });

  return bumpLiveGameState({ ...state, players });
}

export function eliminatePlayer(state: LiveGameState, targetKey: ParticipantKey): LiveGameState {
  return eliminatePlayerAt(state, targetKey, new Date().toISOString());
}

export function eliminatePlayerAt(
  state: LiveGameState,
  targetKey: ParticipantKey,
  eliminatedAt: string,
): LiveGameState {
  const players = state.players.map((player) => {
    if (player.participantKey !== targetKey || player.isEliminated) return player;
    return {
      ...player,
      isEliminated: true,
      eliminatedAt,
      life: Math.min(player.life, 0),
    };
  });

  return bumpLiveGameState({ ...state, players });
}

export function revivePlayer(state: LiveGameState, targetKey: ParticipantKey, startingLife: number): LiveGameState {
  const players = state.players.map((player) => {
    if (player.participantKey !== targetKey || !player.isEliminated) return player;
    const commanderDamageFrom = Object.fromEntries(
      Object.keys(player.commanderDamageFrom).map((key) => [key, 0]),
    ) as Record<ParticipantKey, number>;
    return {
      ...player,
      isEliminated: false,
      eliminatedAt: null,
      life: startingLife,
      infect: 0,
      commanderDamageFrom,
    };
  });

  return bumpLiveGameState({ ...state, players });
}

export function applyLiveGameMutation(
  state: LiveGameState,
  mutation: LiveGameMutation,
): LiveGameState {
  const eventId = mutation.eventId;
  const occurredAt = mutation.occurredAt;
  const appendEvent = (
    next: LiveGameState,
    event: Omit<LiveGameEvent, 'id' | 'occurredAt'>,
    suffix = '',
  ): LiveGameState => {
    if (!eventId || !occurredAt) return next;
    const id = `${eventId}${suffix}`;
    if (next.events.some((entry) => entry.id === id)) return next;
    return {
      ...next,
      events: [...next.events, { id, occurredAt, ...event }].slice(-500),
    };
  };

  if (mutation.type === 'adjust') {
    const beforePlayer = state.players.find((player) => player.participantKey === mutation.targetKey);
    const next = mutation.amount >= 0
      ? applyDamage(state, mutation.targetKey, mutation.amount, mutation.mode, mutation.sourceKey)
      : applyHealing(state, mutation.targetKey, Math.abs(mutation.amount), mutation.mode, mutation.sourceKey);
    let withAutoKo = { ...autoEliminatePlayers(next), version: state.version + 1 };
    const afterPlayer = withAutoKo.players.find((player) => player.participantKey === mutation.targetKey);
    if (beforePlayer && afterPlayer && mutation.amount !== 0) {
      const eventType: LiveGameEventType = mutation.amount < 0 && mutation.mode === 'life'
        ? 'lifegain'
        : mutation.mode === 'commander'
          ? 'commander_damage'
          : mutation.mode === 'infect' ? 'infect' : 'damage';
      withAutoKo = appendEvent(withAutoKo, {
        type: eventType,
        targetKey: mutation.targetKey,
        sourceKey: mutation.sourceKey ?? null,
        amount: Math.abs(mutation.amount),
      });
      if (!beforePlayer.isEliminated && afterPlayer.isEliminated) {
        withAutoKo = appendEvent(withAutoKo, {
          type: 'elimination',
          targetKey: mutation.targetKey,
          sourceKey: mutation.sourceKey ?? null,
          amount: null,
        }, ':ko');
      }
    }
    return withAutoKo;
  }
  if (mutation.type === 'eliminate') {
    return appendEvent(eliminatePlayerAt(state, mutation.targetKey, mutation.eliminatedAt), {
      type: 'elimination',
      targetKey: mutation.targetKey,
      sourceKey: null,
      amount: null,
    });
  }
  if (mutation.type === 'revive') {
    return appendEvent(revivePlayer(state, mutation.targetKey, mutation.startingLife), {
      type: 'revive',
      targetKey: mutation.targetKey,
      sourceKey: null,
      amount: null,
    });
  }

  const players = state.players.map((player) => (
    player.participantKey === mutation.player.participantKey ? mutation.player : player
  ));
  return appendEvent(bumpLiveGameState({ ...state, players }), {
    type: 'correction',
    targetKey: mutation.player.participantKey,
    sourceKey: null,
    amount: null,
  });
}

export function autoEliminatePlayers(state: LiveGameState): LiveGameState {
  let next = state;
  state.players.forEach((player) => {
    if (!player.isEliminated && shouldAutoEliminate(player)) {
      next = eliminatePlayer(next, player.participantKey);
    }
  });
  return next;
}

export function pickRandomPlayer(state: LiveGameState, pool?: ParticipantKey[]): LiveGamePlayer | null {
  const keys = pool?.length
    ? pool
    : getActivePlayers(state).map((player) => player.participantKey);

  const active = state.players.filter(
    (player) => !player.isEliminated && keys.includes(player.participantKey),
  );

  if (active.length === 0) return null;
  return active[Math.floor(Math.random() * active.length)];
}

export function getSuggestedWinner(state: LiveGameState): LiveGamePlayer | null {
  const standing = getActivePlayers(state);
  if (standing.length === 1) return standing[0];
  return null;
}

export function parseLiveGameState(raw: unknown): LiveGameState {
  if (!raw || typeof raw !== 'object') return { version: 0, players: [], events: [] };
  const value = raw as Partial<LiveGameState>;
  return {
    version: typeof value.version === 'number' ? value.version : 0,
    players: Array.isArray(value.players) ? value.players as LiveGamePlayer[] : [],
    layoutVariant: value.layoutVariant === 'opposed' ? 'opposed' : 'classic',
    startingPlayerKey: typeof value.startingPlayerKey === 'string'
      ? value.startingPlayerKey as ParticipantKey
      : null,
    startingDirection: value.startingDirection === 'clockwise' || value.startingDirection === 'counterclockwise'
      ? value.startingDirection
      : null,
    events: Array.isArray(value.events) ? value.events as LiveGameEvent[] : [],
  };
}
