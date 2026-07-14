interface ArenaMembershipGroup {
  created_by: string;
}

interface ArenaMembershipProfile {
  id: string;
}

export function canLeaveArena(memberCount: number, isMember: boolean) {
  return isMember && memberCount > 1;
}

export function canKickArenaMember(input: {
  actorId: string;
  targetId: string;
  group: ArenaMembershipGroup | null | undefined;
  isPlatformAdmin: boolean;
}) {
  const { actorId, targetId, group, isPlatformAdmin } = input;
  if (!group || actorId === targetId) {
    return false;
  }

  return isPlatformAdmin || group.created_by === actorId;
}

export function isArenaMember(
  members: ArenaMembershipProfile[],
  userId: string | null | undefined,
) {
  if (!userId) return false;
  return members.some((member) => member.id === userId);
}

export function canManageArenaMembership(input: {
  userId: string | null | undefined;
  group: ArenaMembershipGroup | null | undefined;
  isPlatformAdmin: boolean;
}) {
  const { userId, group, isPlatformAdmin } = input;
  if (!userId || !group) return false;
  return isPlatformAdmin || group.created_by === userId;
}