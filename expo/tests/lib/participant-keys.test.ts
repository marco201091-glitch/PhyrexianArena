import { describe, expect, it } from 'vitest';
import {
  normalizeGuestName,
  parseParticipantKey,
  toGuestParticipantKey,
  toUserParticipantKey,
} from '@/lib/participant-keys';

describe('participant keys', () => {
  it('round-trips user and guest identifiers', () => {
    expect(parseParticipantKey(toUserParticipantKey('user-id'))).toEqual({ type: 'user', id: 'user-id' });
    expect(parseParticipantKey(toGuestParticipantKey('guest-id'))).toEqual({ type: 'guest', id: 'guest-id' });
  });

  it('rejects empty and unknown key kinds', () => {
    expect(parseParticipantKey('user:')).toBeNull();
    expect(parseParticipantKey('guest:')).toBeNull();
    expect(parseParticipantKey('player:id')).toBeNull();
  });

  it('normalizes guest names for duplicate detection', () => {
    expect(normalizeGuestName('  MARCO Rossi  ')).toBe('marco rossi');
  });
});
