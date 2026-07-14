import { describe, expect, it } from 'vitest';
import { parseArenaCacheSnapshot } from '@/lib/arena-cache';

const now = Date.parse('2026-07-14T10:00:00.000Z');
const snapshot = {
  groupId: 'arena-1',
  userId: 'user-1',
  group: { id: 'arena-1' },
  members: [],
  matches: [],
  guests: [],
  decks: [],
  savedAt: '2026-07-14T09:00:00.000Z',
};

describe('arena cache', () => {
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
});
