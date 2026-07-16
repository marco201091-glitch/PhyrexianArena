import type { LiveGameEvent, LiveGameRecord } from '@/lib/live-game';
import type { ParticipantKey } from '@/lib/participant-keys';

export type LiveGameRecapPoint = {
  occurredAt: string;
  life: number;
};

export type LiveGameRecapPlayer = {
  participantKey: ParticipantKey;
  displayName: string;
  commander: string;
  commanderImage: string | null;
  finalLife: number;
  eliminatedAt: string | null;
  timeline: LiveGameRecapPoint[];
};

export type LiveGameRecap = {
  totalEvents: number;
  startedAt: string | null;
  endedAt: string | null;
  players: LiveGameRecapPlayer[];
  highlights: LiveGameEvent[];
};

function lifeDelta(event: LiveGameEvent) {
  if (event.type === 'damage') return -(event.amount ?? 0);
  if (event.type === 'lifegain') return event.amount ?? 0;
  if (event.type === 'commander_damage') {
    return event.direction === 'decrease' ? event.amount ?? 0 : -(event.amount ?? 0);
  }
  return 0;
}

export function buildLiveGameRecap(record: LiveGameRecord): LiveGameRecap {
  const orderedEvents = [...record.state.events].sort((left, right) => (
    left.occurredAt.localeCompare(right.occurredAt) || left.id.localeCompare(right.id)
  ));
  const players = record.state.players.map((player) => {
    let life = record.starting_life;
    const timeline: LiveGameRecapPoint[] = [{
      occurredAt: record.started_at ?? record.created_at,
      life,
    }];
    orderedEvents.forEach((event) => {
      if (event.targetKey !== player.participantKey) return;
      const delta = lifeDelta(event);
      if (!delta) return;
      life += delta;
      timeline.push({ occurredAt: event.occurredAt, life });
    });
    return {
      participantKey: player.participantKey,
      displayName: player.displayName,
      commander: player.commander,
      commanderImage: player.commanderImage,
      finalLife: player.life,
      eliminatedAt: player.eliminatedAt,
      timeline,
    };
  });
  return {
    totalEvents: record.state.summary?.totalEvents ?? orderedEvents.length,
    startedAt: record.started_at,
    endedAt: record.ended_at,
    players,
    highlights: orderedEvents.filter((event) => (
      event.type === 'elimination' || event.type === 'revive' || Boolean(event.groupScope)
    )).slice(-12),
  };
}
