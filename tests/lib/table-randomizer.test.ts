import { describe, expect, it } from 'vitest';
import { rollTableRandom, rollUniformDie } from '@/lib/table-randomizer';

describe('table randomizer', () => {
  it('keeps every supported die in range', () => {
    ([4, 6, 20] as const).forEach((sides) => {
      for (let index = 0; index < 100; index += 1) {
        expect(rollUniformDie(sides)).toBeGreaterThanOrEqual(1);
        expect(rollUniformDie(sides)).toBeLessThanOrEqual(sides);
      }
    });
  });

  it('returns a valid coin face', () => {
    expect(['heads', 'tails']).toContain(rollTableRandom('coin'));
  });
});
