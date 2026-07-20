import { describe, expect, it } from 'vitest';
import { createLiveGameLobbySecrets, hashGuestSecret } from '@/lib/live-game-guest';

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
