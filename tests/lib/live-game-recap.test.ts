import { describe, expect, it } from 'vitest';
import { buildHistoricalLiveGameRecord, buildLiveGameRecap } from '@/lib/live-game-recap';
import { buildLiveGameRecapShareSvg } from '@/lib/live-game-recap-share';
import type { LiveGameRecord } from '@/lib/live-game';

describe('live-game recap', () => {
  it('shows compact final counters without inventing a life timeline', () => {
    const record = {
      id: 'game', group_id: 'group', created_by: 'user', status: 'ended', starting_life: 40,
      match_id: 'match', started_at: '2026-01-01T00:00:00.000Z', ended_at: '2026-01-01T00:10:00.000Z',
      created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:10:00.000Z',
      state: {
        version: 2,
        startingPlayerKey: 'user:a',
        startingDirection: 'clockwise',
        players: [{ slot: 0, participantKey: 'user:a', deckId: 'deck', displayName: 'A', commander: 'Atraxa', commanderImage: null, life: 38, infect: 0, commanderDamageFrom: {}, counters: { energy: 0, experience: 0, commanderTax: 0, monarch: false, initiative: false }, isEliminated: false, eliminatedAt: null }],
        events: [
          { id: '1', type: 'damage', occurredAt: '2026-01-01T00:01:00.000Z', targetKey: 'user:a', sourceKey: null, amount: 5 },
          { id: '2', type: 'lifegain', occurredAt: '2026-01-01T00:02:00.000Z', targetKey: 'user:a', sourceKey: null, amount: 3 },
        ],
        summary: {
          schemaVersion: 1,
          totalEvents: 2,
          firstOccurredAt: '2026-01-01T00:01:00.000Z',
          lastOccurredAt: '2026-01-01T00:02:00.000Z',
          byParticipant: {
            'user:a': { eventCount: 2, lifeLost: 5, lifeGained: 3, lifeDamageDealt: 12, unattributedLifeLost: 5, commanderDamageTaken: 0, commanderDamageDealt: 4, infectReceived: 0, infectDealt: 2, eliminations: 0, eliminationsCaused: 1, revives: 0, corrections: 1, groupDamageDealt: 0, groupDamageEvents: 0 },
          },
        },
      },
    } satisfies LiveGameRecord;
    expect(buildLiveGameRecap(record).players[0]).toMatchObject({
      finalLife: 38,
      finalInfect: 0,
      events: 2,
      damageDealt: 12,
      lifeGained: 3,
      eliminationsCaused: 1,
      corrections: 1,
    });
    expect(buildLiveGameRecap(record)).toMatchObject({ durationSeconds: 600, startingPlayerName: 'A', startingDirection: 'clockwise' });
    const svg = buildLiveGameRecapShareSvg(record, 'it');
    expect(svg).toContain('Riepilogo partita');
    expect(svg).toContain('A');
    expect(svg).toContain('10:00');
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
        life_gained: 6,
        life_damage_dealt: 34,
        eliminations_caused: 2,
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
    const recap = buildLiveGameRecap(record);
    expect(recap.highlights).toHaveLength(1);
    expect(recap.players[0]).toMatchObject({ events: 18, damageDealt: 34, lifeGained: 6, eliminationsCaused: 2 });
  });
});
