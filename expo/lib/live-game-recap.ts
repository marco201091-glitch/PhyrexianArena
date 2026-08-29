import {
  createLiveGamePlayer,
  createLiveGameSummary,
  parseLiveGameState,
  type LiveGameEvent,
  type LiveGameRecord,
} from '@/lib/live-game';
import {
  getParticipantDeckSnapshot,
  getParticipantDisplayName,
  getParticipantKey,
  type MatchParticipantRecord,
} from '@/lib/arena-participants';
import type { ParticipantKey } from '@/lib/participant-keys';

export type LiveGameRecapPlayer = {
  participantKey: ParticipantKey;
  displayName: string;
  commander: string;
  commanderImage: string | null;
  finalLife: number;
  finalInfect: number;
  eliminatedAt: string | null;
  events: number;
  damageDealt: number;
  lifeGained: number;
  eliminationsCaused: number;
  lifeLost: number;
  commanderDamageDealt: number;
  commanderDamageTaken: number;
  infectDealt: number;
  infectReceived: number;
  corrections: number;
};

export type LiveGameRecap = {
  totalEvents: number;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  startingPlayerKey: ParticipantKey | null;
  startingPlayerName: string | null;
  startingDirection: 'clockwise' | 'counterclockwise' | null;
  players: LiveGameRecapPlayer[];
  highlights: LiveGameEvent[];
};

type HistoricalMatchSnapshot = {
  id: string;
  group_id: string;
  created_by: string;
  played_at: string;
  duration_seconds?: number | null;
  starting_life?: number | null;
  live_game_log?: unknown[] | null;
  match_participants: MatchParticipantRecord[];
};

/**
 * Rebuilds the compact recap from permanent match snapshots. This intentionally
 * avoids depending on the short-lived live_games row after retention cleanup.
 */
export function buildHistoricalLiveGameRecord(match: HistoricalMatchSnapshot): LiveGameRecord {
  const startingLife = match.starting_life ?? 40;
  const participants = match.match_participants
    .map((participant) => ({ participant, key: getParticipantKey(participant) }))
    .filter((entry): entry is { participant: MatchParticipantRecord; key: ParticipantKey } => Boolean(entry.key));
  const participantKeys = participants.map(({ key }) => key);
  const parsedLog = parseLiveGameState({
    version: 1,
    events: Array.isArray(match.live_game_log) ? match.live_game_log : [],
  });
  const totalEvents = match.match_participants.reduce(
    (total, participant) => total + (participant.tracked_event_count ?? 0),
    0,
  );
  const summary = {
    ...createLiveGameSummary(),
    totalEvents,
    firstOccurredAt: parsedLog.events.at(0)?.occurredAt ?? null,
    lastOccurredAt: parsedLog.events.at(-1)?.occurredAt ?? null,
    byParticipant: Object.fromEntries(participants.map(({ participant, key }) => [key, {
      eventCount: participant.tracked_event_count ?? 0,
      lifeLost: participant.life_lost ?? 0,
      lifeGained: participant.life_gained ?? 0,
      lifeDamageDealt: participant.life_damage_dealt ?? 0,
      unattributedLifeLost: participant.unattributed_life_lost ?? 0,
      commanderDamageTaken: participant.commander_damage_taken ?? 0,
      commanderDamageDealt: participant.commander_damage_dealt ?? 0,
      infectReceived: participant.infect_received ?? 0,
      infectDealt: participant.infect_dealt ?? 0,
      eliminations: participant.eliminations ?? 0,
      eliminationsCaused: participant.eliminations_caused ?? 0,
      revives: participant.revives ?? 0,
      corrections: participant.corrections ?? 0,
      groupDamageDealt: participant.group_damage_dealt ?? 0,
      groupDamageEvents: participant.group_damage_events ?? 0,
    }])),
  };
  const endedAt = match.duration_seconds != null
    ? new Date(new Date(match.played_at).getTime() + match.duration_seconds * 1000).toISOString()
    : match.played_at;

  return {
    id: `match-snapshot:${match.id}`,
    group_id: match.group_id,
    created_by: match.created_by,
    status: 'ended',
    starting_life: startingLife,
    state: {
      version: 1,
      players: participants.map(({ participant, key }, slot) => {
        const deck = getParticipantDeckSnapshot(participant);
        return {
          ...createLiveGamePlayer({
            slot,
            participantKey: key,
            deckId: participant.deck_id ?? participant.guest_deck_id ?? '',
            displayName: getParticipantDisplayName(participant),
            commander: deck?.commander ?? '',
            commanderImage: deck?.commander_image ?? null,
            startingLife,
            allParticipantKeys: participantKeys,
          }),
          life: participant.final_life ?? startingLife,
          infect: participant.final_infect ?? 0,
          isEliminated: participant.eliminated_at != null,
          eliminatedAt: participant.eliminated_at ?? null,
        };
      }),
      events: parsedLog.events,
      summary,
    },
    match_id: match.id,
    started_at: match.played_at,
    ended_at: endedAt,
    created_at: match.played_at,
    updated_at: endedAt,
  };
}

export function buildLiveGameRecap(record: LiveGameRecord): LiveGameRecap {
  const orderedEvents = [...record.state.events].sort((left, right) => (
    left.occurredAt.localeCompare(right.occurredAt) || left.id.localeCompare(right.id)
  ));
  const players = record.state.players.map((player) => {
    const metrics = record.state.summary?.byParticipant[player.participantKey];
    return {
      participantKey: player.participantKey,
      displayName: player.displayName,
      commander: player.commander,
      commanderImage: player.commanderImage,
      finalLife: player.life,
      finalInfect: player.infect,
      eliminatedAt: player.eliminatedAt,
      events: metrics?.eventCount ?? 0,
      damageDealt: metrics?.lifeDamageDealt ?? 0,
      lifeGained: metrics?.lifeGained ?? 0,
      eliminationsCaused: metrics?.eliminationsCaused ?? 0,
      lifeLost: metrics?.lifeLost ?? 0,
      commanderDamageDealt: metrics?.commanderDamageDealt ?? 0,
      commanderDamageTaken: metrics?.commanderDamageTaken ?? 0,
      infectDealt: metrics?.infectDealt ?? 0,
      infectReceived: metrics?.infectReceived ?? 0,
      corrections: metrics?.corrections ?? 0,
    };
  });
  const durationSeconds = record.started_at && record.ended_at
    ? Math.max(0, Math.round((new Date(record.ended_at).getTime() - new Date(record.started_at).getTime()) / 1000))
    : null;
  const startingPlayerKey = record.state.startingPlayerKey ?? null;
  return {
    totalEvents: record.state.summary?.totalEvents ?? orderedEvents.length,
    startedAt: record.started_at,
    endedAt: record.ended_at,
    durationSeconds,
    startingPlayerKey,
    startingPlayerName: players.find((player) => player.participantKey === startingPlayerKey)?.displayName ?? null,
    startingDirection: record.state.startingDirection ?? null,
    players,
    highlights: orderedEvents.slice(-12),
  };
}
