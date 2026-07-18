import { describe, expect, it } from 'vitest';
import {
  GUEST_LIVE_SYNC_INTERVAL_MS,
  HOST_ONLY_SYNC_INTERVAL_MS,
  LIVE_GAME_SYNC_BATCH_SIZE,
  getLiveGameSyncDelay,
} from '@/lib/live-game-sync-policy';

describe('live-game sync policy', () => {
  it('batches a host-only web game for one minute', () => {
    expect(getLiveGameSyncDelay({ hasRemoteGuests: false, queueDepth: 1 }))
      .toBe(HOST_ONLY_SYNC_INTERVAL_MS);
  });

  it('keeps remote guests near realtime', () => {
    expect(getLiveGameSyncDelay({ hasRemoteGuests: true, queueDepth: 1 }))
      .toBe(GUEST_LIVE_SYNC_INTERVAL_MS);
  });

  it('flushes immediately at the batch limit', () => {
    expect(getLiveGameSyncDelay({
      hasRemoteGuests: false,
      queueDepth: LIVE_GAME_SYNC_BATCH_SIZE,
    })).toBe(0);
  });
});
