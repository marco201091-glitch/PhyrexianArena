import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ArenaGuest } from '@/lib/arena-participants';
import type { ArenaDetail, ArenaMatch, ArenaProfile, MemberDeck } from '@/lib/types/arena';
import type { ArenaGroup } from '@/lib/types/group';

const CACHE_PREFIX = 'phyrexian-arena:arena-cache:v1:';
const GROUPS_CACHE_PREFIX = 'phyrexian-arena:groups-cache:v1:';
const MAX_CACHE_AGE_MS = 14 * 24 * 60 * 60 * 1000;

export type ArenaCacheSnapshot = {
  groupId: string;
  userId: string;
  group: ArenaDetail;
  members: ArenaProfile[];
  matches: ArenaMatch[];
  guests: ArenaGuest[];
  decks: MemberDeck[];
  savedAt: string;
};

type GroupsCacheSnapshot = { userId: string; groups: ArenaGroup[]; savedAt: string };

function cacheKey(groupId: string, userId: string): string {
  return `${CACHE_PREFIX}${userId}:${groupId}`;
}

export function parseArenaCacheSnapshot(
  raw: string | null,
  groupId: string,
  userId: string,
  now = Date.now(),
): ArenaCacheSnapshot | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ArenaCacheSnapshot>;
    const savedAt = Date.parse(parsed.savedAt || '');
    if (
      parsed.groupId !== groupId ||
      parsed.userId !== userId ||
      !parsed.group?.id ||
      !Array.isArray(parsed.members) ||
      !Array.isArray(parsed.matches) ||
      !Array.isArray(parsed.guests) ||
      !Array.isArray(parsed.decks) ||
      !Number.isFinite(savedAt) ||
      now - savedAt > MAX_CACHE_AGE_MS
    ) return null;
    return parsed as ArenaCacheSnapshot;
  } catch {
    return null;
  }
}

export async function loadArenaCache(groupId: string, userId: string): Promise<ArenaCacheSnapshot | null> {
  try {
    return parseArenaCacheSnapshot(await AsyncStorage.getItem(cacheKey(groupId, userId)), groupId, userId);
  } catch {
    return null;
  }
}

export async function saveArenaCache(
  snapshot: Omit<ArenaCacheSnapshot, 'savedAt'>,
): Promise<void> {
  try {
    await AsyncStorage.setItem(cacheKey(snapshot.groupId, snapshot.userId), JSON.stringify({
      ...snapshot,
      savedAt: new Date().toISOString(),
    } satisfies ArenaCacheSnapshot));
  } catch {
    // The cache is an optimization; network data remains authoritative.
  }
}

export async function clearArenaCache(groupId: string, userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(cacheKey(groupId, userId));
  } catch {
    // Best effort.
  }
}

export async function loadGroupsCache(userId: string): Promise<ArenaGroup[] | null> {
  try {
    const raw = await AsyncStorage.getItem(`${GROUPS_CACHE_PREFIX}${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GroupsCacheSnapshot>;
    const savedAt = Date.parse(parsed.savedAt || '');
    if (
      parsed.userId !== userId ||
      !Array.isArray(parsed.groups) ||
      !Number.isFinite(savedAt) ||
      Date.now() - savedAt > MAX_CACHE_AGE_MS
    ) return null;
    return parsed.groups;
  } catch {
    return null;
  }
}

export async function saveGroupsCache(userId: string, groups: ArenaGroup[]): Promise<void> {
  try {
    await AsyncStorage.setItem(`${GROUPS_CACHE_PREFIX}${userId}`, JSON.stringify({
      userId,
      groups,
      savedAt: new Date().toISOString(),
    } satisfies GroupsCacheSnapshot));
  } catch {
    // Best effort.
  }
}
