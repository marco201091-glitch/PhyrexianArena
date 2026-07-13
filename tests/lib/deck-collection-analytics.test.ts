import { describe, expect, it } from 'vitest';
import {
  buildAverageDeckCmc,
  buildDeckCollectionAnalytics,
  buildDeckColorCombination,
  getDeckCommanderNames,
} from '@/lib/deck-collection-analytics';

describe('deck-collection-analytics', () => {
  it('prefers commander_options names over parsed commander string', () => {
    const names = getDeckCommanderNames({
      commander: 'Ignored / String',
      commander_options: [
        { name: 'Kraum, Ludevic\'s Opus', imageUrl: null, colorIdentity: ['U', 'R'] },
        { name: 'Tymna the Weaver', imageUrl: null, colorIdentity: ['W', 'B'] },
      ],
    });

    expect(names).toEqual(['Kraum, Ludevic\'s Opus', 'Tymna the Weaver']);
  });

  it('builds stable full color combination keys', () => {
    expect(buildDeckColorCombination(['G', 'R', 'U'])).toEqual({
      key: 'U-R-G',
      colors: ['U', 'R', 'G'],
    });
    expect(buildDeckColorCombination(['C'])).toEqual({
      key: 'C',
      colors: ['C'],
    });
  });

  it('aggregates bracket, color, combination, and source stats', () => {
    const analytics = buildDeckCollectionAnalytics([
      {
        id: '1',
        commander: 'Atraxa',
        bracket: '3',
        source_type: 'moxfield',
        color_identity: ['W', 'U', 'B', 'G'],
        commander_options: null,
      },
      {
        id: '2',
        commander: 'Korvold / Partner',
        bracket: '4',
        source_type: 'archidekt',
        color_identity: ['B', 'R', 'G'],
        commander_options: null,
      },
      {
        id: '3',
        commander: 'Sol Ring',
        bracket: null,
        source_type: 'manual',
        color_identity: ['C'],
        commander_options: null,
      },
    ]);

    expect(analytics.deckCount).toBe(3);
    expect(analytics.averageBracket).toBe(3.5);
    expect(analytics.bracketKnownCount).toBe(2);
    expect(analytics.topColor?.color).toBe('B');
    expect(analytics.sourceStats.map((entry) => entry.source)).toEqual(['moxfield', 'archidekt', 'manual']);
    expect(analytics.bracketStats).toEqual([
      { bracket: '3', count: 1, percentage: 50 },
      { bracket: '4', count: 1, percentage: 50 },
    ]);
    expect(analytics.combinationStats).toEqual([
      { key: 'W-U-B-G', colors: ['W', 'U', 'B', 'G'], count: 1, percentage: 33 },
      { key: 'B-R-G', colors: ['B', 'R', 'G'], count: 1, percentage: 33 },
      { key: 'C', colors: ['C'], count: 1, percentage: 33 },
    ]);
  });

  it('groups decks by exact full color identity', () => {
    const analytics = buildDeckCollectionAnalytics([
      {
        id: '1',
        commander: 'A',
        bracket: '2',
        color_identity: ['B', 'R'],
        commander_options: null,
      },
      {
        id: '2',
        commander: 'B',
        bracket: '3',
        color_identity: ['R', 'B'],
        commander_options: null,
      },
      {
        id: '3',
        commander: 'C',
        bracket: '2',
        color_identity: ['W', 'U'],
        commander_options: null,
      },
    ]);

    expect(analytics.topCombination).toEqual({
      key: 'B-R',
      colors: ['B', 'R'],
      count: 2,
      percentage: 67,
    });
  });

  it('averages stored commander cmc across decks with known values', () => {
    const average = buildAverageDeckCmc([
      {
        id: '1',
        commander: 'A // B',
        bracket: '2',
        commander_cmc: 3,
        commander_options: null,
      },
      {
        id: '2',
        commander: 'C',
        bracket: '2',
        commander_cmc: 5,
        commander_options: null,
      },
    ]);

    expect(average).toBe(4);
  });

  it('ignores decks without stored commander cmc when averaging', () => {
    const average = buildAverageDeckCmc([
      {
        id: '1',
        commander: 'A',
        bracket: '2',
        commander_cmc: 4,
        commander_options: null,
      },
      {
        id: '2',
        commander: 'B',
        bracket: '2',
        commander_cmc: null,
        commander_options: null,
      },
    ]);

    expect(average).toBe(4);
  });
});