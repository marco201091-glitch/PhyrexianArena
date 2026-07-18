import type { LiveGameMutation } from '@/lib/live-game';

export const LIVE_GAME_HISTORY_LIMIT = 30;

export type LiveGameHistoryEntry = {
  forward: LiveGameMutation;
  inverse: LiveGameMutation;
};

export type LiveGameHistory = {
  undo: LiveGameHistoryEntry[];
  redo: LiveGameHistoryEntry[];
};

export function createLiveGameHistory(): LiveGameHistory {
  return { undo: [], redo: [] };
}

export function parseLiveGameHistory(value: unknown): LiveGameHistory {
  if (!value || typeof value !== 'object') return createLiveGameHistory();
  const candidate = value as Partial<LiveGameHistory>;
  return {
    undo: Array.isArray(candidate.undo) ? candidate.undo.slice(-LIVE_GAME_HISTORY_LIMIT) : [],
    redo: Array.isArray(candidate.redo) ? candidate.redo.slice(-LIVE_GAME_HISTORY_LIMIT) : [],
  };
}

export function recordLiveGameHistory(
  history: LiveGameHistory,
  entry: LiveGameHistoryEntry,
): LiveGameHistory {
  return {
    undo: [...history.undo.slice(-(LIVE_GAME_HISTORY_LIMIT - 1)), entry],
    redo: [],
  };
}

export function undoLiveGameHistory(history: LiveGameHistory) {
  const entry = history.undo.at(-1);
  if (!entry) return null;
  return {
    mutation: { ...entry.inverse, isCorrection: true } satisfies LiveGameMutation,
    history: {
      undo: history.undo.slice(0, -1),
      redo: [...history.redo.slice(-(LIVE_GAME_HISTORY_LIMIT - 1)), entry],
    } satisfies LiveGameHistory,
  };
}

export function redoLiveGameHistory(history: LiveGameHistory) {
  const entry = history.redo.at(-1);
  if (!entry) return null;
  return {
    mutation: { ...entry.forward, isCorrection: false } satisfies LiveGameMutation,
    history: {
      undo: [...history.undo.slice(-(LIVE_GAME_HISTORY_LIMIT - 1)), entry],
      redo: history.redo.slice(0, -1),
    } satisfies LiveGameHistory,
  };
}
