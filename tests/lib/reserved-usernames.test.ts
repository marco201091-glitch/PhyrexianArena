import { describe, expect, it } from 'vitest';
import { isReservedUsername, RESERVED_USERNAMES } from '@/lib/reserved-usernames';

describe('reserved-usernames', () => {
  it('blocks reserved names case-insensitively', () => {
    expect(isReservedUsername('Administrator')).toBe(true);
    expect(isReservedUsername(' DEMO ')).toBe(true);
    expect(isReservedUsername('Marco')).toBe(false);
  });

  it('keeps the reserved set stable', () => {
    expect(RESERVED_USERNAMES.has('administrator')).toBe(true);
    expect(RESERVED_USERNAMES.has('demo')).toBe(true);
  });
});