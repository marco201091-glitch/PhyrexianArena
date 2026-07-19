import { describe, expect, it } from 'vitest';
import {
  LIVE_GAME_SYNC_BATCH_SIZE,
  LIVE_GAME_SYNC_DEBOUNCE_MS,
  LIVE_GAME_SYNC_MAX_WAIT_MS,
  getLiveGameSyncDelay,
} from '@/lib/live-game-sync-policy';

describe('native live-game sync policy', () => {
  it('batches bursts without delaying realtime beyond one second', () => {
    expect(getLiveGameSyncDelay({ queueDepth: 1, batchStartedAt: null }))
      .toBe(LIVE_GAME_SYNC_DEBOUNCE_MS);
    expect(getLiveGameSyncDelay({
      queueDepth: 2,
      batchStartedAt: 2_000,
      now: 2_000 + LIVE_GAME_SYNC_MAX_WAIT_MS - 50,
    })).toBe(50);
  });

  it('flushes full batches immediately', () => {
    expect(getLiveGameSyncDelay({
      queueDepth: LIVE_GAME_SYNC_BATCH_SIZE,
      batchStartedAt: 2_000,
    })).toBe(0);
  });
});
