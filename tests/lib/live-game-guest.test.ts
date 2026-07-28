import { describe, expect, it } from 'vitest';
import { createLiveGameLobbySecrets, hashGuestSecret, parseGuestMutation } from '@/lib/live-game-guest';
import { createLiveGamePlayer, type LiveGameState } from '@/lib/live-game';

describe('live game guest lobby secrets', () => {
  it('creates every value required by the lobby schema', () => {
    const secrets = createLiveGameLobbySecrets();

    expect(secrets.token).toMatch(/^[a-f0-9]{48}$/);
    expect(secrets.inviteTokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(secrets.inviteTokenHash).toBe(hashGuestSecret(secrets.token));
    expect(secrets.realtimeTopic).toMatch(/^[a-f0-9]{48}$/);
    expect(secrets.realtimeTopic).not.toBe(secrets.token);
  });
});

describe('guest mutation permissions', () => {
  const guestKey = 'guest:11111111-1111-4111-8111-111111111111' as const;
  const otherKey = 'user:22222222-2222-4222-8222-222222222222' as const;
  const keys = [guestKey, otherKey];
  const state: LiveGameState = {
    version: 0,
    events: [],
    players: [
      createLiveGamePlayer({ slot: 0, participantKey: guestKey, displayName: 'Guest', commander: 'A', deckId: 'deck-a', commanderImage: null, startingLife: 40, allParticipantKeys: keys }),
      createLiveGamePlayer({ slot: 1, participantKey: otherKey, displayName: 'Host', commander: 'B', deckId: 'deck-b', commanderImage: null, startingLife: 40, allParticipantKeys: keys }),
    ],
  };

  it('allows a guest to update their own counter', () => {
    expect(parseGuestMutation({ type: 'adjust', targetKey: guestKey, amount: -1, mode: 'life' }, state, guestKey))
      .toMatchObject({ type: 'adjust', targetKey: guestKey, amount: -1 });
  });

  it('rejects mutations against another participant', () => {
    expect(parseGuestMutation({ type: 'adjust', targetKey: otherKey, amount: -1, mode: 'life' }, state, guestKey)).toBeNull();
    expect(parseGuestMutation({ type: 'eliminate', targetKey: otherKey }, state, guestKey)).toBeNull();
  });
});
