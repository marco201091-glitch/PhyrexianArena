import { describe, expect, it } from 'vitest';
import { getDeckMastery, getDeckMasteryLabel } from '@/lib/deck-mastery';

describe('deck mastery v7 compatibility', () => {
  it('derives score from existing v6 match totals without stored state', () => {
    expect(getDeckMastery(0, 0)).toMatchObject({ tier: 'unranked', points: 0 });
    expect(getDeckMastery(4, 2)).toMatchObject({ tier: 'bronze', points: 8 });
  });

  it.each([
    [1, 0, 1, 'bronze'],
    [10, 0, 10, 'silver'],
    [20, 0, 20, 'gold'],
    [40, 0, 40, 'platinum'],
    [60, 0, 60, 'diamond'],
    [34, 33, 100, 'diamond'],
  ] as const)('maps games=%i wins=%i to %i points/%s', (games, wins, points, tier) => {
    expect(getDeckMastery(games, wins)).toMatchObject({ points, tier });
  });

  it('sanitizes impossible historical counters and keeps bilingual labels', () => {
    expect(getDeckMastery(2, 9).points).toBe(6);
    expect(getDeckMastery(-1, -2).points).toBe(0);
    expect(getDeckMasteryLabel('diamond', 'it')).toBe('Diamante');
    expect(getDeckMasteryLabel('diamond', 'en')).toBe('Diamond');
  });
});
