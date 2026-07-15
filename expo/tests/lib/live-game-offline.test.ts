import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createLiveGamePlayer, type LiveGameRecord } from '@/lib/live-game';

const storage = vi.hoisted(() => new Map<string, string>());

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => { storage.set(key, value); }),
    removeItem: vi.fn(async (key: string) => { storage.delete(key); }),
    multiSet: vi.fn(async (entries: [string, string][]) => {
      entries.forEach(([key, value]) => storage.set(key, value));
    }),
  },
}));

import {
  archiveAndClearLiveGameSession,
  clearLiveGameOfflineSession,
  loadLiveGameOfflineSession,
  loadLiveGameOutbox,
  saveLiveGameOfflineSession,
  saveLiveGameOutbox,
} from '@/lib/live-game-offline';

const sessionKey = 'phyrexian-arena:live-game:v2:group-1';
const outboxKey = 'phyrexian-arena:live-game:v2:outbox';

function record(id = 'live-1'): LiveGameRecord {
  return {
    id, group_id: 'group-1', created_by: 'user-1', status: 'active', starting_life: 40,
    state: {
      version: 0, events: [], players: [createLiveGamePlayer({
        slot: 0, participantKey: 'user:user-1', deckId: 'deck-1', displayName: 'Marco',
        commander: 'Atraxa', commanderImage: null, startingLife: 40,
        allParticipantKeys: ['user:user-1'],
      })],
    },
    match_id: null, started_at: '2026-07-15T10:00:00.000Z', ended_at: null,
    created_at: '2026-07-15T10:00:00.000Z', updated_at: '2026-07-15T10:00:00.000Z',
  };
}

describe('live game offline persistence', () => {
  beforeEach(() => storage.clear());

  it('round-trips sessions and fills optional legacy fields safely', async () => {
    await saveLiveGameOfflineSession('group-1', {
      record: record(), serverRecord: record(), needsCreate: true, mutations: [],
      pendingFinalization: null, pendingCancel: false,
    });
    const loaded = await loadLiveGameOfflineSession('group-1');
    expect(loaded).toMatchObject({ needsCreate: true, pendingCancel: false });
    expect(loaded?.record.state.layoutVariant).toBe('classic');
    expect(Date.parse(loaded?.savedAt ?? '')).not.toBeNaN();

    storage.set(sessionKey, JSON.stringify({ record: record() }));
    expect(await loadLiveGameOfflineSession('group-1')).toMatchObject({
      needsCreate: false, mutations: [], pendingFinalization: null, pendingCancel: false,
      savedAt: '1970-01-01T00:00:00.000Z',
    });
  });

  it('rejects malformed, incomplete, and corrupted session data', async () => {
    storage.set(sessionKey, '{bad json');
    expect(await loadLiveGameOfflineSession('group-1')).toBeNull();
    storage.set(sessionKey, JSON.stringify({ record: { id: 'x', state: {} } }));
    expect(await loadLiveGameOfflineSession('group-1')).toBeNull();
    storage.delete(sessionKey);
    expect(await loadLiveGameOfflineSession('group-1')).toBeNull();
  });

  it('round-trips outbox entries and recovers from corrupted storage', async () => {
    const item = { id: 'op-1', serverRecord: record(), needsCreate: false, mutations: [], finalization: null, cancel: true };
    await saveLiveGameOutbox([item]);
    expect(await loadLiveGameOutbox()).toEqual([item]);
    storage.set(outboxKey, '{broken');
    expect(await loadLiveGameOutbox()).toEqual([]);
    storage.set(outboxKey, JSON.stringify({ not: 'an array' }));
    expect(await loadLiveGameOutbox()).toEqual([]);
  });

  it('deduplicates archived operations and clears the active session atomically', async () => {
    const old = { id: 'op-1', serverRecord: record('old'), needsCreate: false, mutations: [], finalization: null, cancel: false };
    const replacement = { ...old, serverRecord: record('new'), cancel: true };
    await saveLiveGameOutbox([old]);
    storage.set(sessionKey, JSON.stringify({ record: record() }));
    await archiveAndClearLiveGameSession('group-1', replacement);
    expect(await loadLiveGameOutbox()).toEqual([replacement]);
    expect(storage.get(sessionKey)).toBe('null');
    await clearLiveGameOfflineSession('group-1');
    expect(storage.has(sessionKey)).toBe(false);
  });
});
