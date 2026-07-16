import { describe, expect, it } from 'vitest';
import { buildLiveGameRecap } from '@/lib/live-game-recap';
import type { LiveGameRecord } from '@/lib/live-game';

describe('live-game recap', () => {
  it('rebuilds life timeline from bounded events', () => {
    const record = {
      id: 'game', group_id: 'group', created_by: 'user', status: 'ended', starting_life: 40,
      match_id: 'match', started_at: '2026-01-01T00:00:00.000Z', ended_at: '2026-01-01T00:10:00.000Z',
      created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:10:00.000Z',
      state: {
        version: 2,
        players: [{ slot: 0, participantKey: 'user:a', deckId: 'deck', displayName: 'A', commander: 'Atraxa', commanderImage: null, life: 38, infect: 0, commanderDamageFrom: {}, isEliminated: false, eliminatedAt: null }],
        events: [
          { id: '1', type: 'damage', occurredAt: '2026-01-01T00:01:00.000Z', targetKey: 'user:a', sourceKey: null, amount: 5 },
          { id: '2', type: 'lifegain', occurredAt: '2026-01-01T00:02:00.000Z', targetKey: 'user:a', sourceKey: null, amount: 3 },
        ],
      },
    } satisfies LiveGameRecord;
    expect(buildLiveGameRecap(record).players[0].timeline.map((point) => point.life)).toEqual([40, 35, 38]);
  });
});
