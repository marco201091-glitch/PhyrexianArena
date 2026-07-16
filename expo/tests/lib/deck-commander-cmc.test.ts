import { describe, expect, it } from 'vitest';
import { buildAverageStoredCommanderCmc, parseStoredCommanderCmc } from '@/lib/deck-commander-cmc';

describe('stored commander mana value', () => {
  it('parses finite numeric and string values', () => {
    expect(parseStoredCommanderCmc(3.5)).toBe(3.5);
    expect(parseStoredCommanderCmc(' 4.0 ')).toBe(4);
    expect(parseStoredCommanderCmc(Number.POSITIVE_INFINITY)).toBeNull();
    expect(parseStoredCommanderCmc('bad')).toBeNull();
    expect(parseStoredCommanderCmc('')).toBeNull();
  });

  it('rounds averages to one decimal and ignores unknown entries', () => {
    expect(buildAverageStoredCommanderCmc([
      { commander_cmc: 2 }, { commander_cmc: '3' }, { commander_cmc: null },
    ])).toBe(2.5);
    expect(buildAverageStoredCommanderCmc([{ commander_cmc: 'bad' }])).toBeNull();
  });
});
