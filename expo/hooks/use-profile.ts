import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAvatarObjectState, resolveAvatarUrl } from '@/lib/avatar-storage';
import { getSupabaseErrorMessage } from '@/lib/supabase-errors';
import { supabase } from '@/lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { apiPost } from '@/lib/api';
import type { ProfileRow } from '@/lib/types/profile';

type ProfileSnapshot = {
  profile: ProfileRow;
  hasAvatar: boolean;
  avatarRevision: string | null;
};

export function useProfile(userId: string | undefined) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ['profile', userId] as const, [userId]);
  const {
    data: profileData,
    isPending,
    refetch,
  } = useQuery<ProfileSnapshot>({
    queryKey,
    enabled: Boolean(userId),
    staleTime: 60_000,
    queryFn: async () => {
      const current = await supabase
        .from('profiles')
        .select('id, username, display_name, created_at, avatar_revision, archidekt_username, archidekt_auto_import, archidekt_last_sync_at')
        .eq('id', userId!)
        .single();

      if (!current.error) {
        const profile = current.data as ProfileRow;
        return {
          profile,
          hasAvatar: Boolean(profile.avatar_revision),
          avatarRevision: profile.avatar_revision ?? null,
        };
      }

      // V6 compatibility while production is still on the previous schema.
      const [{ data, error }, avatarState] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, username, display_name, created_at, archidekt_username, archidekt_auto_import, archidekt_last_sync_at')
          .eq('id', userId!)
          .single(),
        getAvatarObjectState(supabase, userId!),
      ]);
      if (error) throw error;
      return {
        profile: data as ProfileRow,
        hasAvatar: avatarState.exists,
        avatarRevision: avatarState.revision,
      };
    },
  });

  const refresh = useCallback(async () => {
    if (!userId) return;
    const result = await refetch();
    if (result.error) {
      console.error(
        'Error fetching profile:',
        getSupabaseErrorMessage(result.error, 'Failed to fetch profile'),
      );
    }
  }, [refetch, userId]);

  const updateDisplayName = useCallback(async (displayName: string) => {
    if (!userId) return;

    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName.trim() || null })
      .eq('id', userId);

    if (error) throw error;
    await queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey, userId]);

  const uploadAvatar = useCallback(async (uri: string, mimeType: string) => {
    if (!userId) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(mimeType)) {
      throw new Error('INVALID_IMAGE_FORMAT');
    }

    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    const estimatedBytes = Math.floor((base64.length * 3) / 4);
    if (estimatedBytes > 2 * 1024 * 1024) throw new Error('IMAGE_TOO_LARGE');
    const { data, error, status } = await apiPost<{ avatarRevision: string }>('/api/profile/avatar', { base64, mimeType });
    if (status !== 200 || !data?.avatarRevision) throw new Error(error || 'AVATAR_UPLOAD_FAILED');
    const avatarRevision = data.avatarRevision;
    queryClient.setQueryData<ProfileSnapshot>(queryKey, (current) => current
      ? { ...current, hasAvatar: true, avatarRevision }
      : current);
  }, [queryClient, queryKey, userId]);

  const getAvatarUrl = useCallback((version: number) => {
    return resolveAvatarUrl(
      supabase,
      userId,
      Boolean(profileData?.hasAvatar),
      version,
      profileData?.avatarRevision ?? null,
    );
  }, [profileData?.avatarRevision, profileData?.hasAvatar, userId]);

  return {
    profile: profileData?.profile ?? null,
    loading: Boolean(userId) && isPending,
    hasAvatar: Boolean(profileData?.hasAvatar),
    refresh,
    updateDisplayName,
    uploadAvatar,
    getAvatarUrl,
  };
}
