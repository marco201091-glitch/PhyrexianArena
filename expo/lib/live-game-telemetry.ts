import type { SupabaseClient } from '@supabase/supabase-js';

export interface LiveGameTelemetrySnapshot {
  mutationSyncs: number;
  versionConflicts: number;
  failedSyncs: number;
  maxQueueDepth: number;
  slowestSyncMs: number;
  lastError: string | null;
}

const snapshot: LiveGameTelemetrySnapshot = {
  mutationSyncs: 0,
  versionConflicts: 0,
  failedSyncs: 0,
  maxQueueDepth: 0,
  slowestSyncMs: 0,
  lastError: null,
};
let lastPersistedSignature = '';

export function recordLiveGameQueueDepth(depth: number) {
  snapshot.maxQueueDepth = Math.max(snapshot.maxQueueDepth, depth);
}

export function recordLiveGameMutationSync(input: {
  durationMs: number;
  conflicts: number;
  failed?: boolean;
}) {
  snapshot.mutationSyncs += input.failed ? 0 : 1;
  snapshot.failedSyncs += input.failed ? 1 : 0;
  snapshot.versionConflicts += input.conflicts;
  snapshot.slowestSyncMs = Math.max(snapshot.slowestSyncMs, Math.round(input.durationMs));
}

export function sanitizeLiveGameTelemetryError(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error);
  return raw
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, '[email]')
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi, '[id]')
    .replace(/https?:\/\/\S+/gi, '[url]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300) || 'Unknown sync error';
}

export function recordLiveGameSyncError(error: unknown) {
  snapshot.failedSyncs += 1;
  snapshot.lastError = sanitizeLiveGameTelemetryError(error);
}

export function getLiveGameTelemetrySnapshot(): LiveGameTelemetrySnapshot {
  return { ...snapshot };
}

export async function persistLiveGameTelemetry(client: SupabaseClient, input: {
  userId: string;
  liveGameId: string | null;
  sessionId: string;
  platform: 'web' | 'expo';
}) {
  const value = getLiveGameTelemetrySnapshot();
  const signature = JSON.stringify({ ...input, value });
  if (signature === lastPersistedSignature) return;
  const { error } = await client.from('live_game_telemetry').upsert({
    user_id: input.userId,
    live_game_id: input.liveGameId,
    session_id: input.sessionId,
    client_platform: input.platform,
    mutation_syncs: value.mutationSyncs,
    version_conflicts: value.versionConflicts,
    failed_syncs: value.failedSyncs,
    max_queue_depth: value.maxQueueDepth,
    slowest_sync_ms: value.slowestSyncMs,
    last_error: value.lastError,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,session_id' });
  if (error) throw error;
  lastPersistedSignature = signature;
}
