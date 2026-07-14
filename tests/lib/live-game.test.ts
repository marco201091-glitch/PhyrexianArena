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

  it('uses the same event log and compact analytics engine as native', () => {
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
    expect(next.events[0]).toMatchObject({ type: 'commander_damage', amount: 7 });
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
});
