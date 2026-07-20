import { describe, expect, it } from 'vitest';
import {
  LIVE_GAME_SYNC_BATCH_SIZE,
  LIVE_GAME_SYNC_DEBOUNCE_MS,
  LIVE_GAME_SYNC_MAX_WAIT_MS,
  getLiveGameSyncDelay,
} from '@/lib/live-game-sync-policy';

describe('live-game sync policy', () => {
  it('uses a short realtime-friendly debounce', () => {
    expect(getLiveGameSyncDelay({ queueDepth: 1, batchStartedAt: null }))
      .toBe(LIVE_GAME_SYNC_DEBOUNCE_MS);
  });

  it('enforces a bounded maximum wait during continuous input', () => {
    expect(getLiveGameSyncDelay({
      queueDepth: 3,
      batchStartedAt: 1_000,
      now: 1_000 + LIVE_GAME_SYNC_MAX_WAIT_MS - 100,
    })).toBe(100);
    expect(getLiveGameSyncDelay({
      queueDepth: 3,
      batchStartedAt: 1_000,
      now: 1_000 + LIVE_GAME_SYNC_MAX_WAIT_MS,
    })).toBe(0);
  });

  it('flushes immediately at the batch limit', () => {
    expect(getLiveGameSyncDelay({
      queueDepth: LIVE_GAME_SYNC_BATCH_SIZE,
      batchStartedAt: 1_000,
    })).toBe(0);
  });
});
