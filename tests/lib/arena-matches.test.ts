import { describe, expect, it } from 'vitest';
import { ARENA_MATCHES_FETCH_LIMIT } from '@/lib/arena-matches';

describe('arena-matches', () => {
  it('loads up to 500 matches per arena', () => {
    expect(ARENA_MATCHES_FETCH_LIMIT).toBe(500);
  });
});