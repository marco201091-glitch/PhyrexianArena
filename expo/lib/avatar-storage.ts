import type { SupabaseClient } from '@supabase/supabase-js';

function avatarObjectPath(userId: string) {
  return `${userId}/avatar`;
}

export type AvatarObjectState = {
  exists: boolean;
  revision: string | null;
};

export async function getAvatarObjectState(
  client: SupabaseClient,
  userId: string,
): Promise<AvatarObjectState> {
  const { data, error } = await client.storage.from('avatars').list(userId, { limit: 20 });
  if (error || !data?.length) return { exists: false, revision: null };

  const avatar = data.find((file) => file.name === 'avatar' || file.name.startsWith('avatar.'));
  if (!avatar) return { exists: false, revision: null };

  return {
    exists: true,
    revision: avatar.updated_at || avatar.created_at || avatar.id || avatar.name,
  };
}

export async function userHasAvatar(client: SupabaseClient, userId: string) {
  return (await getAvatarObjectState(client, userId)).exists;
}

export function getAvatarPublicUrl(
  client: SupabaseClient,
  userId: string,
  version: number,
  revision?: string | null,
) {
  const { data } = client.storage.from('avatars').getPublicUrl(avatarObjectPath(userId));
  return `${data.publicUrl}?v=${encodeURIComponent(`${revision || '0'}-${version}`)}`;
}

export function resolveAvatarUrl(
  client: SupabaseClient,
  userId: string | undefined,
  hasAvatar: boolean,
  version: number,
  revision?: string | null,
) {
  if (!userId || !hasAvatar) return null;
  return getAvatarPublicUrl(client, userId, version, revision);
}
