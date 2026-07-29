import { describe, expect, it } from 'vitest';
import {
  ARENA_MATCH_CACHE_LIMIT,
  ARENA_MATCHES_FETCH_LIMIT,
  ARENA_MATCHES_PAGE_SIZE,
} from '@/lib/arena-matches';

describe('arena-matches', () => {
  it('bounds history and cache pages without limiting permanent storage', () => {
    expect(ARENA_MATCHES_PAGE_SIZE).toBe(100);
    expect(ARENA_MATCH_CACHE_LIMIT).toBe(100);
    expect(ARENA_MATCHES_FETCH_LIMIT).toBe(100);
  });
});
