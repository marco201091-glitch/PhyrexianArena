import { getParticipantDeckSnapshot } from '@/lib/arena-participants';
import { fetchArenaMatches } from '@/lib/arena-queries';
import {
  collectDeckCommanderNames,
  collectDeckImageUrls,
  initDeckImageCache,
  prefetchCommanderNames,
  prefetchDeckImageUrls,
  splitCommanderNames,
} from '@/lib/deck-image-cache';
import type { ProfileDeck } from '@/lib/types/profile';
import { supabase } from '@/lib/supabase';

const MATCH_PREFETCH_LIMIT = 80;
const GROUP_PREFETCH_LIMIT = 8;

let warmedForUserId: string | null = null;
let warmInFlight: Promise<void> | null = null;

async function fetchUserDecks(userId: string): Promise<ProfileDeck[]> {
  const { data, error } = await supabase
    .from('decks')
    .select('*')
    .eq('user_id', userId)
    .is('group_id', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as ProfileDeck[]) || [];
}

async function fetchUserGroupIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', userId);

  if (error) throw error;
  return (data || [])
    .map((row) => row.group_id)
    .filter((groupId): groupId is string => Boolean(groupId))
    .slice(0, GROUP_PREFETCH_LIMIT);
}

async function prefetchRecentArenaImages(groupIds: string[]): Promise<void> {
  const imageUrls: string[] = [];
  const commanderNames: string[] = [];

  await Promise.allSettled(
    groupIds.map(async (groupId) => {
      const matches = await fetchArenaMatches(supabase, groupId);
      const recentMatches = matches.slice(0, MATCH_PREFETCH_LIMIT);

      recentMatches.forEach((match) => {
        match.match_participants.forEach((participant) => {
          const deck = getParticipantDeckSnapshot(participant);
          if (!deck) return;
          if (deck.commander_image) imageUrls.push(deck.commander_image);
          commanderNames.push(deck.commander);
        });
      });
    }),
  );

  await prefetchDeckImageUrls(imageUrls, { background: true });
  await prefetchCommanderNames(commanderNames, { background: true });
}

async function warmUserImageCache(userId: string): Promise<void> {
  await initDeckImageCache();

  const [decks, groupIds] = await Promise.all([
    fetchUserDecks(userId),
    fetchUserGroupIds(userId),
  ]);

  await prefetchDeckImageUrls(collectDeckImageUrls(decks), { background: true });
  await prefetchCommanderNames(collectDeckCommanderNames(decks), { background: true });

  const standaloneNames = decks.flatMap((deck) => splitCommanderNames(deck.commander));
  await prefetchCommanderNames(standaloneNames, { background: true });

  if (groupIds.length > 0) {
    await prefetchRecentArenaImages(groupIds);
  }
}

export function scheduleWarmUserImageCache(userId: string | undefined): void {
  if (!userId) return;
  if (warmedForUserId === userId && warmInFlight) return;

  warmedForUserId = userId;
  warmInFlight = warmUserImageCache(userId).catch(() => undefined);
}