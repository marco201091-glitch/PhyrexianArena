export const LIVE_GAME_SYNC_DEBOUNCE_MS = 500;
export const LIVE_GAME_SYNC_MAX_WAIT_MS = 1_000;
export const LIVE_GAME_SYNC_BATCH_SIZE = 40;

export function getLiveGameSyncDelay(input: {
  queueDepth: number;
  batchStartedAt: number | null;
  now?: number;
}) {
  if (input.queueDepth <= 0 || input.queueDepth >= LIVE_GAME_SYNC_BATCH_SIZE) return 0;
  if (input.batchStartedAt === null) return LIVE_GAME_SYNC_DEBOUNCE_MS;
  const elapsed = Math.max(0, (input.now ?? Date.now()) - input.batchStartedAt);
  return Math.min(
    LIVE_GAME_SYNC_DEBOUNCE_MS,
    Math.max(0, LIVE_GAME_SYNC_MAX_WAIT_MS - elapsed),
  );
}
