import { describe, expect, it } from 'vitest';
import {
  normalizeGuestName,
  parseParticipantKey,
  toGuestParticipantKey,
  toUserParticipantKey,
} from '@/lib/participant-keys';

describe('participant-keys', () => {
  it('builds and parses user keys', () => {
    const key = toUserParticipantKey('abc-123');
    expect(key).toBe('user:abc-123');
    expect(parseParticipantKey(key)).toEqual({ type: 'user', id: 'abc-123' });
  });

  it('builds and parses guest keys', () => {
    const key = toGuestParticipantKey('guest-9');
    expect(key).toBe('guest:guest-9');
    expect(parseParticipantKey(key)).toEqual({ type: 'guest', id: 'guest-9' });
  });

  it('rejects malformed keys', () => {
    expect(parseParticipantKey('user:')).toBeNull();
    expect(parseParticipantKey('guest:')).toBeNull();
    expect(parseParticipantKey('player:1')).toBeNull();
  });

  it('normalizes guest names', () => {
    expect(normalizeGuestName('  Marco  ')).toBe('marco');
  });
});