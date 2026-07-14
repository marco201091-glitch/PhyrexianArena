import { describe, expect, it } from 'vitest';
import {
  canKickArenaMember,
  canLeaveArena,
  canManageArenaMembership,
  isArenaMember,
} from '@/lib/arena-membership';

const group = { created_by: 'owner-1' };

describe('arena-membership', () => {
  it('allows leaving when more than one member', () => {
    expect(canLeaveArena(2, true)).toBe(true);
    expect(canLeaveArena(1, true)).toBe(false);
    expect(canLeaveArena(3, false)).toBe(false);
  });

  it('detects arena membership', () => {
    expect(isArenaMember([{ id: 'u1' }, { id: 'u2' }], 'u2')).toBe(true);
    expect(isArenaMember([{ id: 'u1' }], 'u9')).toBe(false);
    expect(isArenaMember([], null)).toBe(false);
  });

  it('lets owners and admins manage membership', () => {
    expect(canManageArenaMembership({ userId: 'owner-1', group, isPlatformAdmin: false })).toBe(true);
    expect(canManageArenaMembership({ userId: 'member-2', group, isPlatformAdmin: false })).toBe(false);
    expect(canManageArenaMembership({ userId: 'member-2', group, isPlatformAdmin: true })).toBe(true);
  });

  it('lets owners and admins kick members', () => {
    expect(canKickArenaMember({
      actorId: 'owner-1',
      targetId: 'member-2',
      group,
      isPlatformAdmin: false,
    })).toBe(true);

    expect(canKickArenaMember({
      actorId: 'member-2',
      targetId: 'member-3',
      group,
      isPlatformAdmin: false,
    })).toBe(false);

    expect(canKickArenaMember({
      actorId: 'owner-1',
      targetId: 'owner-1',
      group,
      isPlatformAdmin: false,
    })).toBe(false);
  });
});