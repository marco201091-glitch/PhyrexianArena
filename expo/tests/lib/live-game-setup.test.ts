import { describe, expect, it } from 'vitest';
import { createDefaultLiveGameSetup, parseLiveGameSetup } from '@/lib/live-game-setup';

describe('live game setup', () => {
  it('defaults to four classic seats at 40 life', () => {
    expect(createDefaultLiveGameSetup()).toMatchObject({
      playerCount: 4,
      layoutVariant: 'classic',
      startingLife: 40,
    });
  });

  it('rejects malformed seat counts and parses valid setups', () => {
    expect(parseLiveGameSetup(JSON.stringify({ playerCount: 4, seats: [] }))).toBeNull();
    const parsed = parseLiveGameSetup(JSON.stringify({
      playerCount: 3,
      layoutVariant: 'opposed',
      startingLife: 25,
      seats: [
        { participantKey: 'user:a', deckId: 'deck-a' },
        { participantKey: null, deckId: null },
        { participantKey: 'guest:b', deckId: 'deck-b' },
      ],
    }));
    expect(parsed?.layoutVariant).toBe('opposed');
    expect(parsed?.seats).toHaveLength(3);
  });
});
