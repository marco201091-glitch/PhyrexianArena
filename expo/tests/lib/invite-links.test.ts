import { describe, expect, it } from 'vitest';
import {
  buildArenaInviteUrl,
  buildCounterGuestInviteUrl,
  buildGameGuestInviteUrl,
} from '@/lib/invite-links';

describe('invite links rendered into local QR codes', () => {
  it('builds canonical arena, game, and counter guest routes', () => {
    const origin = 'https://example.com/';

    expect(buildArenaInviteUrl(origin, 'arena code')).toBe('https://example.com/join/arena%20code');
    expect(buildGameGuestInviteUrl(origin, 'game/token')).toBe('https://example.com/game/join/game%2Ftoken');
    expect(buildCounterGuestInviteUrl(origin, 'counter/token')).toBe('https://example.com/counter/join/counter%2Ftoken');
  });
});
