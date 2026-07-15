import { beforeEach, describe, expect, it, vi } from 'vitest';

const storage = vi.hoisted(() => new Map<string, string>());
const fail = vi.hoisted(() => ({ reads: false, writes: false }));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => {
      if (fail.reads) throw new Error('read failed');
      return storage.get(key) ?? null;
    }),
    setItem: vi.fn(async (key: string, value: string) => {
      if (fail.writes) throw new Error('write failed');
      storage.set(key, value);
    }),
    removeItem: vi.fn(async (key: string) => {
      if (fail.writes) throw new Error('remove failed');
      storage.delete(key);
    }),
  },
}));

import {
  clearArenaCache,
  loadArenaCache,
  loadGroupsCache,
  parseArenaCacheSnapshot,
  saveArenaCache,
  saveGroupsCache,
} from '@/lib/arena-cache';

const now = Date.parse('2026-07-14T10:00:00.000Z');
const snapshot = {
  groupId: 'arena-1',
  userId: 'user-1',
  group: {
    id: 'arena-1', name: 'Friday', description: null, invite_code: 'ABC123',
    created_by: 'user-1', created_at: '2026-07-01T00:00:00.000Z',
    profiles: { id: 'user-1', username: 'marco', display_name: 'Marco' },
    group_members: [],
  },
  members: [],
  matches: [],
  guests: [],
  decks: [],
  savedAt: '2026-07-14T09:00:00.000Z',
};

describe('arena cache', () => {
  beforeEach(() => {
    storage.clear();
    fail.reads = false;
    fail.writes = false;
  });

  it('accepts a recent cache scoped to the current user and arena', () => {
    expect(parseArenaCacheSnapshot(JSON.stringify(snapshot), 'arena-1', 'user-1', now)?.group.id).toBe('arena-1');
  });

  it('rejects cross-user and stale cache entries', () => {
    expect(parseArenaCacheSnapshot(JSON.stringify(snapshot), 'arena-1', 'user-2', now)).toBeNull();
    expect(parseArenaCacheSnapshot(
      JSON.stringify({ ...snapshot, savedAt: '2026-06-01T09:00:00.000Z' }),
      'arena-1',
      'user-1',
      now,
    )).toBeNull();
  });

  it('rejects malformed snapshots and future schema gaps', () => {
    expect(parseArenaCacheSnapshot('{broken', 'arena-1', 'user-1', now)).toBeNull();
    expect(parseArenaCacheSnapshot(JSON.stringify({ ...snapshot, members: null }), 'arena-1', 'user-1', now)).toBeNull();
    expect(parseArenaCacheSnapshot(JSON.stringify({ ...snapshot, savedAt: 'invalid' }), 'arena-1', 'user-1', now)).toBeNull();
  });

  it('round-trips and clears an arena snapshot scoped by user and arena', async () => {
    const { savedAt: _savedAt, ...unsaved } = snapshot;
    await saveArenaCache(unsaved as Parameters<typeof saveArenaCache>[0]);
    expect(await loadArenaCache('arena-1', 'user-1')).toMatchObject({ groupId: 'arena-1', userId: 'user-1' });
    expect(await loadArenaCache('arena-1', 'user-2')).toBeNull();
    await clearArenaCache('arena-1', 'user-1');
    expect(await loadArenaCache('arena-1', 'user-1')).toBeNull();
  });

  it('treats cache I/O failures as misses without breaking the app flow', async () => {
    fail.reads = true;
    expect(await loadArenaCache('arena-1', 'user-1')).toBeNull();
    expect(await loadGroupsCache('user-1')).toBeNull();
    fail.reads = false;
    fail.writes = true;
    const { savedAt: _savedAt, ...unsaved } = snapshot;
    await expect(saveArenaCache(unsaved as Parameters<typeof saveArenaCache>[0])).resolves.toBeUndefined();
    await expect(saveGroupsCache('user-1', [])).resolves.toBeUndefined();
    await expect(clearArenaCache('arena-1', 'user-1')).resolves.toBeUndefined();
  });

  it('round-trips group lists and rejects cross-user or stale data', async () => {
    const groups = [{
      id: 'arena-1', name: 'Friday', description: null, invite_code: 'ABC', created_by: 'user-1',
      created_at: '2026-07-01T00:00:00.000Z', profiles: { username: 'marco', display_name: 'Marco' },
      group_members: [{ user_id: 'user-1' }],
    }];
    await saveGroupsCache('user-1', groups);
    expect(await loadGroupsCache('user-1')).toEqual(groups);

    const key = 'phyrexian-arena:groups-cache:v1:user-1';
    storage.set(key, JSON.stringify({ userId: 'other', groups, savedAt: new Date().toISOString() }));
    expect(await loadGroupsCache('user-1')).toBeNull();
    storage.set(key, JSON.stringify({ userId: 'user-1', groups, savedAt: '2026-01-01T00:00:00.000Z' }));
    expect(await loadGroupsCache('user-1')).toBeNull();
  });
});
