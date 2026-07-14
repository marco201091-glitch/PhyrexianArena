import { describe, expect, it } from 'vitest';
import {
  applyLiveGameMutation,
  createLiveGamePlayer,
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

    expect(lifegain.events.map((event) => [event.type, event.sourceKey, event.amount])).toEqual([
      ['commander_damage', keys[0], 5],
      ['damage', null, 2],
      ['lifegain', null, 3],
    ]);
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
});
