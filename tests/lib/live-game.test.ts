import { describe, expect, it } from 'vitest';
import {
  applyLiveGameMutation,
  applyDamage,
  autoEliminatePlayers,
  COMMANDER_DAMAGE_LIMIT,
  createLiveGamePlayer,
  eliminatePlayer,
  getSuggestedWinner,
  isValidLiveGameResult,
  pickRandomPlayer,
  type LiveGameState,
} from '@/lib/live-game';

function buildState(): LiveGameState {
  const keys = ['user:a', 'user:b', 'user:c', 'user:d'] as const;
  return {
    version: 0,
    events: [],
    players: keys.map((key, slot) => createLiveGamePlayer({
      slot,
      participantKey: key,
      deckId: `deck-${slot}`,
      displayName: `Player ${slot}`,
      commander: `Commander ${slot}`,
      commanderImage: null,
      startingLife: 40,
      allParticipantKeys: [...keys],
    })),
  };
}

describe('live-game', () => {
  it('applies life damage and auto-eliminates at zero', () => {
    const state = buildState();
    const damaged = applyDamage(state, 'user:a', 40, 'life');
    const next = autoEliminatePlayers(damaged);
    const player = next.players.find((entry) => entry.participantKey === 'user:a');
    expect(player?.isEliminated).toBe(true);
  });

  it('tracks commander damage separately per source', () => {
    const state = buildState();
    const damaged = applyDamage(state, 'user:b', 10, 'commander', 'user:a');
    const player = damaged.players.find((entry) => entry.participantKey === 'user:b');
    expect(player?.commanderDamageFrom['user:a']).toBe(10);
  });

  it('auto-eliminates on commander damage threshold', () => {
    let state = buildState();
    state = applyDamage(state, 'user:b', COMMANDER_DAMAGE_LIMIT, 'commander', 'user:a');
    state = autoEliminatePlayers(state);
    const player = state.players.find((entry) => entry.participantKey === 'user:b');
    expect(player?.isEliminated).toBe(true);
  });

  it('suggests winner when one player remains', () => {
    let state = buildState();
    state = eliminatePlayer(state, 'user:a');
    state = eliminatePlayer(state, 'user:b');
    state = eliminatePlayer(state, 'user:c');
    const winner = getSuggestedWinner(state);
    expect(winner?.participantKey).toBe('user:d');
  });

  it('picks random player from active pool', () => {
    const state = buildState();
    const picked = pickRandomPlayer(state);
    expect(picked?.participantKey).toMatch(/^user:/);
  });

  it('uses the same compact analytics engine as native', () => {
    const next = applyLiveGameMutation(buildState(), {
      type: 'adjust',
      targetKey: 'user:b',
      sourceKey: 'user:a',
      amount: 7,
      mode: 'commander',
      eventId: 'web-damage-1',
      occurredAt: '2026-07-14T17:00:00.000Z',
    });

    expect(next.players[1]?.life).toBe(33);
    expect(next.events).toEqual([]);
    expect(next.summary?.byParticipant['user:b']?.lifeLost).toBe(7);
    expect(next.summary?.byParticipant['user:a']?.commanderDamageDealt).toBe(7);
  });

  it('requires an alternative condition while multiple players remain', () => {
    const state = buildState();
    expect(isValidLiveGameResult(state, {
      winnerKey: 'user:a', isDraw: false, winCondition: 'combo',
    })).toBe(true);
    expect(isValidLiveGameResult(state, {
      winnerKey: 'user:a', isDraw: false, winCondition: 'last_standing',
    })).toBe(false);
  });

  it('applies opponent-wide damage as one versioned mutation and compact summary', () => {
    const next = applyLiveGameMutation(buildState(), {
      type: 'adjust_many',
      sourceKey: 'user:a',
      amount: 4,
      scope: 'opponents',
      eventId: 'group-hit-1',
      occurredAt: '2026-07-16T12:00:00.000Z',
    });

    expect(next.version).toBe(1);
    expect(next.players.map((player) => player.life)).toEqual([40, 36, 36, 36]);
    expect(next.events).toEqual([]);
    expect(next.summary?.byParticipant['user:a']?.groupDamageDealt).toBe(12);
    expect(next.summary?.byParticipant['user:a']?.groupDamageEvents).toBe(3);
  });

  it('reverses compact group metrics when opponent-wide damage is undone', () => {
    const damaged = applyLiveGameMutation(buildState(), {
      type: 'adjust_many', sourceKey: 'user:a', amount: 4, scope: 'opponents',
      eventId: 'group-hit', occurredAt: '2026-07-16T12:00:00.000Z',
    });
    const restored = applyLiveGameMutation(damaged, {
      type: 'adjust_many', sourceKey: 'user:a', amount: -4, scope: 'opponents',
      eventId: 'undo-group-hit', occurredAt: '2026-07-16T12:00:01.000Z', isCorrection: true,
    });

    expect(restored.players.map((player) => player.life)).toEqual([40, 40, 40, 40]);
    expect(restored.summary?.byParticipant['user:a']?.lifeDamageDealt).toBe(0);
    expect(restored.summary?.byParticipant['user:a']?.groupDamageDealt).toBe(0);
    expect(restored.summary?.byParticipant['user:a']?.groupDamageEvents).toBe(0);
    expect(restored.summary?.byParticipant['user:b']?.lifeLost).toBe(0);
  });

  it('supports opponent-wide infect and Exsanguinate-style drain', () => {
    const infected = applyLiveGameMutation(buildState(), {
      type: 'adjust_many',
      sourceKey: 'user:a',
      amount: 2,
      scope: 'opponents',
      mode: 'infect',
    });
    expect(infected.players.map((player) => player.infect)).toEqual([0, 2, 2, 2]);

    const initial = buildState();
    initial.players[0] = { ...initial.players[0]!, life: 20 };
    const drained = applyLiveGameMutation(initial, {
      type: 'adjust_many',
      sourceKey: 'user:a',
      amount: 4,
      scope: 'opponents',
      drain: true,
    });
    expect(drained.players.map((player) => player.life)).toEqual([32, 36, 36, 36]);
    expect(drained.version).toBe(1);
  });

  it('aggregates routine actions without retaining their raw events', () => {
    const next = applyLiveGameMutation(buildState(), {
      type: 'adjust',
      targetKey: 'user:b',
      sourceKey: 'user:a',
      amount: 7,
      mode: 'commander',
      eventId: 'commander-hit',
      occurredAt: '2026-07-19T12:00:00.000Z',
    });

    expect(next.events).toEqual([]);
    expect(next.summary?.totalEvents).toBe(1);
    expect(next.summary?.byParticipant['user:b']?.lifeLost).toBe(7);
    expect(next.summary?.byParticipant['user:a']?.commanderDamageDealt).toBe(7);
  });

  it('retains only significant elimination and revive events', () => {
    const eliminated = applyLiveGameMutation(buildState(), {
      type: 'eliminate',
      targetKey: 'user:b',
      eliminatedAt: '2026-07-19T12:00:00.000Z',
      eventId: 'manual-ko',
      occurredAt: '2026-07-19T12:00:00.000Z',
    });
    const revived = applyLiveGameMutation(eliminated, {
      type: 'revive',
      targetKey: 'user:b',
      startingLife: 40,
      eventId: 'revive',
      occurredAt: '2026-07-19T12:01:00.000Z',
    });

    expect(revived.events.map((event) => event.type)).toEqual(['elimination', 'revive']);
    expect(revived.summary?.totalEvents).toBe(2);
  });
});
