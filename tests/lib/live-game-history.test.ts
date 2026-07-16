import { describe, expect, it } from 'vitest';
import {
  createLiveGameHistory,
  recordLiveGameHistory,
  redoLiveGameHistory,
  undoLiveGameHistory,
} from '@/lib/live-game-history';
import type { LiveGameHistoryEntry } from '@/lib/live-game-history';

describe('live-game history', () => {
  const entry: LiveGameHistoryEntry = {
    forward: { type: 'adjust', targetKey: 'user:a' as const, amount: 5, mode: 'life' as const },
    inverse: { type: 'adjust', targetKey: 'user:a' as const, amount: -5, mode: 'life' as const },
  };

  it('moves actions between undo and redo stacks', () => {
    const recorded = recordLiveGameHistory(createLiveGameHistory(), entry);
    const undone = undoLiveGameHistory(recorded)!;
    expect(undone.mutation).toMatchObject({ amount: -5, isCorrection: true });
    expect(undone.history.undo).toHaveLength(0);
    expect(undone.history.redo).toHaveLength(1);

    const redone = redoLiveGameHistory(undone.history)!;
    expect(redone.mutation).toMatchObject({ amount: 5, isCorrection: false });
    expect(redone.history.undo).toHaveLength(1);
    expect(redone.history.redo).toHaveLength(0);
  });

  it('clears redo after a new action', () => {
    const undone = undoLiveGameHistory(recordLiveGameHistory(createLiveGameHistory(), entry))!;
    const next = recordLiveGameHistory(undone.history, entry);
    expect(next.redo).toEqual([]);
  });
});
