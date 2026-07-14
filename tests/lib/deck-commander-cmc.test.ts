import { describe, expect, it } from 'vitest';
import {
  buildAverageStoredCommanderCmc,
  buildDeckCommanderCmcFromCmcs,
  deckNeedsCommanderCmc,
  parseStoredCommanderCmc,
} from '@/lib/deck-commander-cmc';

describe('deck-commander-cmc', () => {
  it('parses stored commander cmc values', () => {
    expect(parseStoredCommanderCmc(3.5)).toBe(3.5);
    expect(parseStoredCommanderCmc('4.0')).toBe(4);
    expect(parseStoredCommanderCmc(null)).toBeNull();
    expect(parseStoredCommanderCmc('not-a-number')).toBeNull();
  });

  it('detects decks missing commander cmc', () => {
    expect(deckNeedsCommanderCmc({ commander: 'Atraxa', commander_cmc: null })).toBe(true);
    expect(deckNeedsCommanderCmc({ commander: 'Atraxa', commander_cmc: 5 })).toBe(false);
    expect(deckNeedsCommanderCmc({ commander: '  ', commander_cmc: null })).toBe(false);
  });

  it('averages stored commander cmc values', () => {
    expect(buildAverageStoredCommanderCmc([
      { commander_cmc: 2 },
      { commander_cmc: '4' },
    ])).toBe(3);
  });

  it('averages partner commander cmc from lookup map', () => {
    const cmc = buildDeckCommanderCmcFromCmcs(
      {
        commander: 'A // B',
        commander_options: [
          { name: 'A', imageUrl: null },
          { name: 'B', imageUrl: null },
        ],
      },
      { A: 2, B: 4 },
    );

    expect(cmc).toBe(3);
  });
});