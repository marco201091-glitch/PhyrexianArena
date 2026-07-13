import type { SupabaseClient } from '@supabase/supabase-js';

function avatarObjectPath(userId: string) {
  return `${userId}/avatar`;
}

export async function userHasAvatar(client: SupabaseClient, userId: string) {
  const { data, error } = await client.storage.from('avatars').list(userId, { limit: 20 });
  if (error || !data?.length) return false;
  return data.some((file) => file.name === 'avatar' || file.name.startsWith('avatar.'));
}

export function getAvatarPublicUrl(client: SupabaseClient, userId: string, version: number) {
  const { data } = client.storage.from('avatars').getPublicUrl(avatarObjectPath(userId));
  return `${data.publicUrl}?v=${version}`;
}

export function resolveAvatarUrl(
  client: SupabaseClient,
  userId: string | undefined,
  hasAvatar: boolean,
  version: number,
) {
  if (!userId || !hasAvatar) return null;
  return getAvatarPublicUrl(client, userId, version);
}