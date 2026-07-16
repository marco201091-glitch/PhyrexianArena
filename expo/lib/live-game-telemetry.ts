export interface LiveGameTelemetrySnapshot {
  mutationSyncs: number;
  versionConflicts: number;
  failedSyncs: number;
  maxQueueDepth: number;
  slowestSyncMs: number;
}

const snapshot: LiveGameTelemetrySnapshot = {
  mutationSyncs: 0,
  versionConflicts: 0,
  failedSyncs: 0,
  maxQueueDepth: 0,
  slowestSyncMs: 0,
};

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

export function getLiveGameTelemetrySnapshot(): LiveGameTelemetrySnapshot {
  return { ...snapshot };
}
