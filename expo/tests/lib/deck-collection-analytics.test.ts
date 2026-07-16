import { describe, expect, it } from 'vitest';
import {
  buildAverageCommanderCmc,
  buildDeckCollectionAnalytics,
  buildDeckColorCombination,
  getDeckCommanderNames,
} from '@/lib/deck-collection-analytics';

describe('deck collection analytics', () => {
  it('prefers unique commander option names and falls back to split labels', () => {
    expect(getDeckCommanderNames({
      commander: 'Ignored',
      commander_options: [
        { name: ' Tymna ', imageUrl: null },
        { name: 'Tymna', imageUrl: null },
        { name: 'Kraum', imageUrl: null },
      ],
    })).toEqual(['Tymna', 'Kraum']);
    expect(getDeckCommanderNames({ commander: 'A // B', commander_options: null })).toEqual(['A', 'B']);
  });

  it('normalizes color combinations to mana order and colorless fallback', () => {
    expect(buildDeckColorCombination(['G', 'R', 'U'])).toEqual({ key: 'U-R-G', colors: ['U', 'R', 'G'] });
    expect(buildDeckColorCombination([])).toEqual({ key: 'C', colors: ['C'] });
  });

  it('aggregates brackets, colors, combinations, and normalized sources', () => {
    const analytics = buildDeckCollectionAnalytics([
      { id: '1', commander: 'Atraxa', bracket: '3', source_type: 'Moxfield', color_identity: ['W', 'U', 'B', 'G'] },
      { id: '2', commander: 'Korvold', bracket: '4', source_type: 'archidekt', color_identity: ['B', 'R', 'G'] },
      { id: '3', commander: 'Karn', bracket: null, source_type: 'custom', color_identity: ['C'] },
      { id: '4', commander: 'Unknown', bracket: 'invalid', source_type: null, color_identity: null },
    ]);

    expect(analytics).toMatchObject({
      deckCount: 4, averageBracket: 3.5, bracketKnownCount: 2, averageColorCount: 2.3,
    });
    expect(analytics.topColor).toMatchObject({ color: 'B', count: 2 });
    expect(analytics.sourceStats.map(({ source, count }) => [source, count])).toEqual([
      ['moxfield', 1], ['archidekt', 1], ['other', 1], ['manual', 1],
    ]);
    expect(analytics.bracketStats).toEqual([
      { bracket: '3', count: 1, percentage: 50 },
      { bracket: '4', count: 1, percentage: 50 },
    ]);
  });

  it('returns neutral analytics for an empty collection', () => {
    expect(buildDeckCollectionAnalytics([])).toEqual({
      deckCount: 0, averageBracket: null, bracketKnownCount: 0, averageColorCount: null,
      topColor: null, colorStats: [], topCombination: null, combinationStats: [],
      sourceStats: [], bracketStats: [],
    });
  });

  it('averages only finite stored commander mana values', () => {
    expect(buildAverageCommanderCmc([
      { id: '1', commander: 'A', bracket: null, commander_cmc: 2 },
      { id: '2', commander: 'B', bracket: null, commander_cmc: '5' },
      { id: '3', commander: 'C', bracket: null, commander_cmc: 'bad' },
    ])).toBe(3.5);
    expect(buildAverageCommanderCmc([])).toBeNull();
  });
});
