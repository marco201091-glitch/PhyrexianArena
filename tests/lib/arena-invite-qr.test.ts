import { describe, expect, it } from 'vitest';
import { buildArenaJoinUrl, normalizeInviteCode } from '@/lib/arena-invite-qr';

describe('arena invite QR', () => {
  it('accepts bounded invite codes and builds join URL', () => {
    expect(normalizeInviteCode(' PHY123 ')).toBe('PHY123');
    expect(buildArenaJoinUrl('https://example.test/', 'PHY123')).toBe('https://example.test/join/PHY123');
  });

  it('rejects arbitrary QR payloads', () => {
    expect(normalizeInviteCode('https://evil.test')).toBeNull();
    expect(normalizeInviteCode('x')).toBeNull();
  });
});
