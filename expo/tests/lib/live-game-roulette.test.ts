import { describe, expect, it } from 'vitest';
import { buildRouletteSequence } from '@/lib/live-game-roulette';

describe('live game roulette', () => {
  it('creates suspense steps and always ends on the selected winner', () => {
    const keys = ['user:a', 'user:b', 'user:c'] as const;
    const sequence = buildRouletteSequence([...keys], keys[1], 16, () => 0.4);

    expect(sequence).toHaveLength(16);
    expect(sequence.at(-1)).toBe(keys[1]);
    expect(sequence.every((key) => keys.includes(key as typeof keys[number]))).toBe(true);
  });

  it('works with a single eligible player', () => {
    expect(buildRouletteSequence(['user:a'], 'user:a', 4, () => 0)).toEqual([
      'user:a',
      'user:a',
      'user:a',
      'user:a',
    ]);
  });
});
