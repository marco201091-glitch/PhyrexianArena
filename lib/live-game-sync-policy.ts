export const HOST_ONLY_SYNC_INTERVAL_MS = 60_000;
export const GUEST_LIVE_SYNC_INTERVAL_MS = 1_500;
export const LIVE_GAME_SYNC_BATCH_SIZE = 40;

export function getLiveGameSyncDelay(input: {
  hasRemoteGuests: boolean;
  queueDepth: number;
}) {
  if (input.queueDepth >= LIVE_GAME_SYNC_BATCH_SIZE) return 0;
  return input.hasRemoteGuests
    ? GUEST_LIVE_SYNC_INTERVAL_MS
    : HOST_ONLY_SYNC_INTERVAL_MS;
}
