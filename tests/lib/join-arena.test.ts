import { describe, expect, it } from 'vitest';
import { normalizeInviteCode } from '@/lib/join-arena';

describe('join-arena', () => {
  it('normalizes invite codes', () => {
    expect(normalizeInviteCode(' abcd12 ')).toBe('ABCD12');
    expect(normalizeInviteCode('test-code')).toBe('TEST-CODE');
  });
});