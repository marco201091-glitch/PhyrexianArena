import { describe, expect, it } from 'vitest';
import { canKickArenaMember, canLeaveArena, canManageArenaMembership, isArenaMember } from '@/lib/arena-membership';

const group = { created_by: 'owner' };

describe('arena membership permissions', () => {
  it('allows a member to leave only when another member remains', () => {
    expect(canLeaveArena(2, true)).toBe(true);
    expect(canLeaveArena(1, true)).toBe(false);
    expect(canLeaveArena(3, false)).toBe(false);
  });

  it('identifies members safely for missing users', () => {
    expect(isArenaMember([{ id: 'a' }, { id: 'b' }], 'b')).toBe(true);
    expect(isArenaMember([{ id: 'a' }], 'missing')).toBe(false);
    expect(isArenaMember([], null)).toBe(false);
  });

  it('allows owners and platform admins to manage others, never themselves', () => {
    expect(canManageArenaMembership({ userId: 'owner', group, isPlatformAdmin: false })).toBe(true);
    expect(canManageArenaMembership({ userId: 'member', group, isPlatformAdmin: true })).toBe(true);
    expect(canManageArenaMembership({ userId: null, group, isPlatformAdmin: true })).toBe(false);
    expect(canKickArenaMember({ actorId: 'owner', targetId: 'member', group, isPlatformAdmin: false })).toBe(true);
    expect(canKickArenaMember({ actorId: 'member', targetId: 'member', group, isPlatformAdmin: true })).toBe(false);
    expect(canKickArenaMember({ actorId: 'member', targetId: 'other', group: null, isPlatformAdmin: true })).toBe(false);
  });
});
