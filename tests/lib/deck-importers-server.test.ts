import { describe, expect, it } from 'vitest';
import { fetchDeckFromSource } from '@/lib/deck-importers-server';

/**
 * These cases exercise the real Archidekt API on purpose: the contract they
 * cover is how a live payload's transform faces map to distinct commander
 * images, which a hand-written fixture would assert against itself.
 *
 * The catch is that Archidekt refuses requests from datacenter addresses. The
 * production server and a normal machine get 200; GitHub runners get 403. That
 * is an environment block rather than a regression, so a 403 skips the case
 * instead of failing it and turning unrelated pull requests red.
 *
 * Only 403 is tolerated. A 404, a changed payload shape or a parse error still
 * fails the suite.
 */
async function fetchDeckOrSkipOnBlockedHost(context: { skip: () => void }, deckId: string) {
  try {
    return await fetchDeckFromSource('archidekt', deckId, { fresh: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Archidekt (403)')) {
      console.warn(
        `Skipping Archidekt deck ${deckId}: this host is refused with 403. `
        + 'Run the suite from a non-datacenter network to cover it.',
      );
      context.skip();
      return null;
    }
    throw error;
  }
}

describe('fetchFromArchidekt commander options', () => {
  it('assigns distinct images to Eirdu and Isilu transform faces', async (context) => {
    const deck = await fetchDeckOrSkipOnBlockedHost(context, '22733112');
    if (!deck) return;

    expect(deck.commanderOptions).toHaveLength(2);
    expect(deck.commanderOptions[0]?.name).toBe('Eirdu, Carrier of Dawn');
    expect(deck.commanderOptions[1]?.name).toBe('Isilu, Carrier of Twilight');
    expect(deck.commanderOptions[0]?.imageUrl).toBeTruthy();
    expect(deck.commanderOptions[1]?.imageUrl).toBeTruthy();
    expect(deck.commanderOptions[0]?.imageUrl).not.toBe(deck.commanderOptions[1]?.imageUrl);
  }, 30_000);

  it('assigns distinct images to Urabrask DFC faces', async (context) => {
    const deck = await fetchDeckOrSkipOnBlockedHost(context, '9213662');
    if (!deck) return;

    expect(deck.commanderOptions.length).toBeGreaterThanOrEqual(2);
    expect(deck.commanderOptions[0]?.imageUrl).toBeTruthy();
    expect(deck.commanderOptions[1]?.imageUrl).toBeTruthy();
    expect(deck.commanderOptions[0]?.imageUrl).not.toBe(deck.commanderOptions[1]?.imageUrl);
  }, 30_000);
});
