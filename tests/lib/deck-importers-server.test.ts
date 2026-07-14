import { describe, expect, it } from 'vitest';
import { fetchFromArchidekt } from '@/lib/deck-importers-server';

describe('fetchFromArchidekt commander options', () => {
  it('assigns distinct images to Eirdu and Isilu transform faces', async () => {
    const deck = await fetchFromArchidekt('22733112');

    expect(deck.commanderOptions).toHaveLength(2);
    expect(deck.commanderOptions[0]?.name).toBe('Eirdu, Carrier of Dawn');
    expect(deck.commanderOptions[1]?.name).toBe('Isilu, Carrier of Twilight');
    expect(deck.commanderOptions[0]?.imageUrl).toBeTruthy();
    expect(deck.commanderOptions[1]?.imageUrl).toBeTruthy();
    expect(deck.commanderOptions[0]?.imageUrl).not.toBe(deck.commanderOptions[1]?.imageUrl);
  }, 30_000);

  it('assigns distinct images to Urabrask DFC faces', async () => {
    const deck = await fetchFromArchidekt('9213662');

    expect(deck.commanderOptions.length).toBeGreaterThanOrEqual(2);
    expect(deck.commanderOptions[0]?.imageUrl).toBeTruthy();
    expect(deck.commanderOptions[1]?.imageUrl).toBeTruthy();
    expect(deck.commanderOptions[0]?.imageUrl).not.toBe(deck.commanderOptions[1]?.imageUrl);
  }, 30_000);
});