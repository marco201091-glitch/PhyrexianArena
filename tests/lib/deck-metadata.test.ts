import { describe, expect, it } from 'vitest';
import {
  filterSelectableCommanderOptions,
  resolveSelectedCommanderOption,
} from '@/lib/deck-metadata';

describe('deck-metadata commander options', () => {
  it('hides combined partner labels when individual commanders are available', () => {
    const options = filterSelectableCommanderOptions([
      { name: 'Malcolm, Keen-Eyed Navigator', imageUrl: 'https://example.com/malcolm.jpg' },
      { name: 'Rograkh, Son of Rohgahh // Malcolm, Keen-Eyed Navigator', imageUrl: 'https://example.com/combined.jpg' },
      { name: 'Rograkh, Son of Rohgahh', imageUrl: 'https://example.com/rograkh.jpg' },
    ]);

    expect(options.map((option) => option.name)).toEqual([
      'Malcolm, Keen-Eyed Navigator',
      'Rograkh, Son of Rohgahh',
    ]);
  });

  it('keeps single-card DFC face options', () => {
    const options = filterSelectableCommanderOptions([
      { name: 'Eirdu, Carrier of Dawn', imageUrl: 'https://example.com/eirdu.jpg' },
      { name: 'Isilu, Carrier of Twilight', imageUrl: 'https://example.com/isilu.jpg' },
    ]);

    expect(options).toHaveLength(2);
  });

  it('resolves the displayed commander from a combined deck label via image', () => {
    const options = [
      { name: 'Malcolm, Keen-Eyed Navigator', imageUrl: 'https://example.com/malcolm.jpg' },
      { name: 'Rograkh, Son of Rohgahh', imageUrl: 'https://example.com/rograkh.jpg' },
    ];

    expect(resolveSelectedCommanderOption(
      options,
      'Rograkh, Son of Rohgahh // Malcolm, Keen-Eyed Navigator',
      'https://example.com/malcolm.jpg',
    )?.name).toBe('Malcolm, Keen-Eyed Navigator');
  });
});