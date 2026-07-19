import { describe, expect, it } from 'vitest';
import { buildHistoricalLiveGameRecord, buildLiveGameRecap } from '@/lib/live-game-recap';
import type { LiveGameRecord } from '@/lib/live-game';

describe('live-game recap', () => {
  it('shows a compact start-to-finish life recap', () => {
    const record = {
      id: 'game', group_id: 'group', created_by: 'user', status: 'ended', starting_life: 40,
      match_id: 'match', started_at: '2026-01-01T00:00:00.000Z', ended_at: '2026-01-01T00:10:00.000Z',
      created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:10:00.000Z',
      state: {
        version: 2,
        players: [{ slot: 0, participantKey: 'user:a', deckId: 'deck', displayName: 'A', commander: 'Atraxa', commanderImage: null, life: 38, infect: 0, commanderDamageFrom: {}, counters: { energy: 0, experience: 0, commanderTax: 0, monarch: false, initiative: false }, isEliminated: false, eliminatedAt: null }],
        events: [
          { id: '1', type: 'damage', occurredAt: '2026-01-01T00:01:00.000Z', targetKey: 'user:a', sourceKey: null, amount: 5 },
          { id: '2', type: 'lifegain', occurredAt: '2026-01-01T00:02:00.000Z', targetKey: 'user:a', sourceKey: null, amount: 3 },
        ],
      },
    } satisfies LiveGameRecord;
    expect(buildLiveGameRecap(record).players[0].timeline.map((point) => point.life)).toEqual([40, 38]);
  });

  it('rebuilds a recap after the temporary live-game row is purged', () => {
    const record = buildHistoricalLiveGameRecord({
      id: 'match-1',
      group_id: 'group-1',
      created_by: 'user-a',
      played_at: '2026-01-01T00:00:00.000Z',
      duration_seconds: 600,
      starting_life: 20,
      live_game_log: [{
        id: 'ko',
        type: 'elimination',
        occurredAt: '2026-01-01T00:09:00.000Z',
        targetKey: 'user:b',
        sourceKey: 'user:a',
        amount: null,
      }],
      match_participants: [{
        id: 'p-a',
        user_id: 'a',
        guest_id: null,
        deck_id: 'deck-a',
        guest_deck_id: null,
        is_winner: true,
        participant_name_snapshot: 'Alice',
        deck_name_snapshot: 'Counters',
        commander_snapshot: 'Atraxa',
        commander_image_snapshot: 'https://cards.test/atraxa.jpg',
        final_life: 7,
        final_infect: 2,
        tracked_event_count: 18,
      }],
    });

    expect(record).toMatchObject({
      id: 'match-snapshot:match-1',
      status: 'ended',
      starting_life: 20,
      ended_at: '2026-01-01T00:10:00.000Z',
    });
    expect(record.state.players[0]).toMatchObject({
      displayName: 'Alice',
      commander: 'Atraxa',
      life: 7,
      infect: 2,
    });
    expect(record.state.summary?.totalEvents).toBe(18);
    expect(buildLiveGameRecap(record).highlights).toHaveLength(1);
  });
});
