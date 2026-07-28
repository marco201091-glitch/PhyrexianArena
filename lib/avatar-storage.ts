import type { SupabaseClient } from '@supabase/supabase-js';

export type AvatarObjectState = {
  exists: boolean;
  objectName: string | null;
  revision: string | null;
};

export async function getAvatarObjectState(
  client: SupabaseClient,
  userId: string,
): Promise<AvatarObjectState> {
  const { data, error } = await client.storage.from('avatars').list(userId, { limit: 20 });
  if (error || !data?.length) return { exists: false, objectName: null, revision: null };

  const avatar = data.find((file) => file.name === 'avatar' || file.name.startsWith('avatar.'));
  if (!avatar) return { exists: false, objectName: null, revision: null };

  return {
    exists: true,
    objectName: avatar.name,
    revision: avatar.updated_at || avatar.created_at || avatar.id || avatar.name,
  };
}

export function getAvatarPublicUrl(
  client: SupabaseClient,
  userId: string,
  objectName: string,
  version: number,
  revision?: string | null,
) {
  const { data } = client.storage.from('avatars').getPublicUrl(`${userId}/${objectName}`);
  return `${data.publicUrl}?v=${encodeURIComponent(`${revision || '0'}-${version}`)}`;
}

export function resolveAvatarUrl(
  client: SupabaseClient,
  userId: string | undefined,
  objectName: string | null,
  version: number,
  revision?: string | null,
) {
  if (!userId || !objectName) return null;
  return getAvatarPublicUrl(client, userId, objectName, version, revision);
}
