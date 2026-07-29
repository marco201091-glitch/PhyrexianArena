import { describe, expect, it } from 'vitest';
import { getDeckMastery } from '@/lib/deck-mastery';

describe('deck mastery', () => {
  it('awards one point per game plus two extra per win', () => {
    expect(getDeckMastery(12, 4).points).toBe(20);
  });

  it('preserves progress at every tier boundary', () => {
    expect(getDeckMastery(9, 0)).toMatchObject({ tier: 'bronze', nextTarget: 10 });
    expect(getDeckMastery(10, 0)).toMatchObject({ tier: 'silver', progress: 0 });
    expect(getDeckMastery(100, 0)).toMatchObject({ tier: 'diamond', complete: true });
  });
});
