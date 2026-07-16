import { describe, expect, it } from 'vitest';
import {
  applyLiveGameMutation,
  createLiveGamePlayer,
  getDefaultWinCondition,
  isValidLiveGameResult,
  parseLiveGameState,
  type LiveGameState,
} from '@/lib/live-game';

const keys = ['user:a', 'user:b'] as const;

function makeState(): LiveGameState {
  return {
    version: 0,
    events: [],
    startingPlayerKey: keys[0],
    players: keys.map((participantKey, slot) => createLiveGamePlayer({
      slot,
      participantKey,
      deckId: `00000000-0000-0000-0000-00000000000${slot + 1}`,
      displayName: participantKey,
      commander: `Commander ${slot + 1}`,
      commanderImage: null,
      startingLife: 40,
      allParticipantKeys: [...keys],
    })),
  };
}

describe('live game mutations', () => {
  it('keeps the selected table layout through realtime serialization', () => {
    expect(parseLiveGameState({ ...makeState(), layoutVariant: 'opposed' }).layoutVariant).toBe('opposed');
    expect(parseLiveGameState(makeState()).layoutVariant).toBe('classic');
  });

  it('replays damage operations without replacing unrelated player state', () => {
    const first = applyLiveGameMutation(makeState(), {
      type: 'adjust', targetKey: keys[0], amount: 4, mode: 'life',
    });
    const second = applyLiveGameMutation(first, {
      type: 'adjust', targetKey: keys[1], amount: 2, mode: 'infect', sourceKey: keys[0],
    });

    expect(second.version).toBe(2);
    expect(second.players[0]?.life).toBe(36);
    expect(second.players[1]?.life).toBe(40);
    expect(second.players[1]?.infect).toBe(2);
  });

  it('tracks and reverses commander damage as a semantic mutation', () => {
    const damage = {
      type: 'adjust' as const,
      targetKey: keys[1],
      amount: 7,
      mode: 'commander' as const,
      sourceKey: keys[0],
    };
    const applied = applyLiveGameMutation(makeState(), damage);
    const undone = applyLiveGameMutation(applied, { ...damage, amount: -7 });

    expect(applied.players[1]?.commanderDamageFrom[keys[0]]).toBe(7);
    expect(applied.players[1]?.life).toBe(33);
    expect(undone.players[1]?.commanderDamageFrom[keys[0]]).toBe(0);
    expect(undone.players[1]?.life).toBe(40);
    expect(undone.version).toBe(2);
  });

  it('logs only the commander correction that was actually applied', () => {
    const damaged = applyLiveGameMutation(makeState(), {
      type: 'adjust', targetKey: keys[1], sourceKey: keys[0], amount: 2, mode: 'commander',
      eventId: 'damage-two', occurredAt: '2026-07-14T11:00:00.000Z',
    });
    const corrected = applyLiveGameMutation(damaged, {
      type: 'adjust', targetKey: keys[1], sourceKey: keys[0], amount: -5, mode: 'commander',
      eventId: 'correct-five', occurredAt: '2026-07-14T11:01:00.000Z',
    });

    expect(corrected.players[1]?.life).toBe(40);
    expect(corrected.events[1]?.amount).toBe(2);
    expect(corrected.summary?.byParticipant[keys[1]]?.lifeLost).toBe(0);
  });

  it('records attributed damage, other damage, and lifegain in the event log', () => {
    const commanderDamage = applyLiveGameMutation(makeState(), {
      type: 'adjust',
      targetKey: keys[1],
      sourceKey: keys[0],
      amount: 5,
      mode: 'commander',
      eventId: 'event-1',
      occurredAt: '2026-07-14T10:00:00.000Z',
    });
    const otherDamage = applyLiveGameMutation(commanderDamage, {
      type: 'adjust',
      targetKey: keys[1],
      amount: 2,
      mode: 'life',
      eventId: 'event-2',
      occurredAt: '2026-07-14T10:00:05.000Z',
    });
    const lifegain = applyLiveGameMutation(otherDamage, {
      type: 'adjust',
      targetKey: keys[1],
      amount: -3,
      mode: 'life',
      eventId: 'event-3',
      occurredAt: '2026-07-14T10:00:10.000Z',
    });

    expect(lifegain.events.map((event) => [event.type, event.sourceKey, event.amount, event.direction])).toEqual([
      ['commander_damage', keys[0], 5, 'increase'],
      ['damage', null, 2, 'decrease'],
      ['lifegain', null, 3, 'increase'],
    ]);
  });

  it('distinguishes infect and commander damage from their manual corrections', () => {
    const state = makeState();
    const commanderDamage = applyLiveGameMutation(state, {
      type: 'adjust', targetKey: keys[1], sourceKey: keys[0], mode: 'commander', amount: 4,
      eventId: 'commander-up', occurredAt: '2026-07-14T12:00:00.000Z',
    });
    const commanderCorrection = applyLiveGameMutation(commanderDamage, {
      type: 'adjust', targetKey: keys[1], sourceKey: keys[0], mode: 'commander', amount: -2,
      eventId: 'commander-down', occurredAt: '2026-07-14T12:01:00.000Z',
    });
    const infect = applyLiveGameMutation(commanderCorrection, {
      type: 'adjust', targetKey: keys[1], sourceKey: keys[0], mode: 'infect', amount: 3,
      eventId: 'infect-up', occurredAt: '2026-07-14T12:02:00.000Z',
    });
    const infectCorrection = applyLiveGameMutation(infect, {
      type: 'adjust', targetKey: keys[1], sourceKey: keys[0], mode: 'infect', amount: -1,
      eventId: 'infect-down', occurredAt: '2026-07-14T12:03:00.000Z',
    });

    expect(infectCorrection.events.map((event) => [event.type, event.direction])).toEqual([
      ['commander_damage', 'increase'],
      ['commander_damage', 'decrease'],
      ['infect', 'increase'],
      ['infect', 'decrease'],
    ]);
    expect(infectCorrection.summary?.byParticipant[keys[1]]).toMatchObject({
      lifeLost: 2,
      commanderDamageTaken: 2,
      infectReceived: 2,
      corrections: 2,
    });
    expect(infectCorrection.summary?.byParticipant[keys[0]]).toMatchObject({
      lifeDamageDealt: 2,
      commanderDamageDealt: 2,
      infectDealt: 2,
    });
  });

  it('keeps only 500 raw events while preserving exact bounded aggregates', () => {
    let state = makeState();
    for (let index = 0; index < 505; index += 1) {
      state = applyLiveGameMutation(state, {
        type: 'adjust',
        targetKey: keys[1],
        sourceKey: keys[0],
        amount: -1,
        mode: 'life',
        eventId: `overflow-${index}`,
        occurredAt: new Date(Date.UTC(2026, 6, 14, 12, 0, index)).toISOString(),
      });
    }

    expect(state.events).toHaveLength(500);
    expect(state.events[0]?.id).toBe('overflow-5');
    expect(state.summary?.totalEvents).toBe(505);
    expect(state.summary?.byParticipant[keys[1]]?.lifeGained).toBe(505);
  });

  it('rebuilds a summary for legacy states before trimming their raw log', () => {
    const parsed = parseLiveGameState({
      ...makeState(),
      events: [
        {
          id: 'legacy-damage', type: 'damage', occurredAt: '2026-07-14T12:00:00.000Z',
          targetKey: keys[1], sourceKey: null, amount: 4,
        },
        {
          id: 'legacy-gain', type: 'lifegain', occurredAt: '2026-07-14T12:01:00.000Z',
          targetKey: keys[1], sourceKey: null, amount: 2,
        },
      ],
    });

    expect(parsed.summary?.totalEvents).toBe(2);
    expect(parsed.summary?.byParticipant[keys[1]]).toMatchObject({
      lifeLost: 4,
      lifeGained: 2,
      unattributedLifeLost: 4,
    });
  });

  it('restores a player snapshot without overwriting another player', () => {
    const state = makeState();
    const snapshot = state.players[0]!;
    const eliminated = applyLiveGameMutation(state, {
      type: 'eliminate', targetKey: keys[0], eliminatedAt: '2026-07-13T12:00:00.000Z',
    });
    const withOtherDamage = applyLiveGameMutation(eliminated, {
      type: 'adjust', targetKey: keys[1], amount: 3, mode: 'life',
    });
    const restored = applyLiveGameMutation(withOtherDamage, {
      type: 'restore-player', player: snapshot,
    });

    expect(restored.players[0]?.isEliminated).toBe(false);
    expect(restored.players[0]?.life).toBe(40);
    expect(restored.players[1]?.life).toBe(37);
  });

  it('keeps one version increment when damage also triggers auto-KO', () => {
    const state = makeState();
    const next = applyLiveGameMutation(state, {
      type: 'adjust', targetKey: keys[0], amount: 40, mode: 'life',
    });

    expect(next.version).toBe(1);
    expect(next.players[0]?.isEliminated).toBe(true);
  });

  it('applies and reverses table-wide damage atomically', () => {
    const damaged = applyLiveGameMutation(makeState(), {
      type: 'adjust_many', sourceKey: keys[0], amount: 6, scope: 'opponents',
      eventId: 'group-hit', occurredAt: '2026-07-16T12:00:00.000Z',
    });
    const restored = applyLiveGameMutation(damaged, {
      type: 'adjust_many', sourceKey: keys[0], amount: -6, scope: 'opponents',
      eventId: 'undo-group-hit', occurredAt: '2026-07-16T12:00:01.000Z', isCorrection: true,
    });

    expect(damaged.version).toBe(1);
    expect(damaged.players.map((player) => player.life)).toEqual([40, 34]);
    expect(damaged.summary?.byParticipant[keys[0]]?.groupDamageDealt).toBe(6);
    expect(restored.version).toBe(2);
    expect(restored.players.map((player) => player.life)).toEqual([40, 40]);
    expect(restored.summary?.byParticipant[keys[0]]?.groupDamageDealt).toBe(0);
  });

  it('requires an alternative win condition unless only one player remains', () => {
    const activeState = makeState();
    expect(getDefaultWinCondition(activeState)).toBeNull();
    expect(isValidLiveGameResult(activeState, {
      winnerKey: keys[0], isDraw: false, winCondition: 'combo',
    })).toBe(true);
    expect(isValidLiveGameResult(activeState, {
      winnerKey: keys[0], isDraw: false, winCondition: 'last_standing',
    })).toBe(false);

    const lastStanding = applyLiveGameMutation(activeState, {
      type: 'eliminate', targetKey: keys[1], eliminatedAt: '2026-07-14T12:00:00.000Z',
    });
    expect(getDefaultWinCondition(lastStanding)).toBe('last_standing');
    expect(isValidLiveGameResult(lastStanding, {
      winnerKey: keys[0], isDraw: false, winCondition: 'last_standing',
    })).toBe(true);
    expect(isValidLiveGameResult(lastStanding, {
      winnerKey: keys[0], isDraw: false, winCondition: 'combo',
    })).toBe(false);
    expect(isValidLiveGameResult(lastStanding, {
      winnerKey: null, isDraw: true, winCondition: null,
    })).toBe(true);
  });
});
