import { useCallback, useEffect, useState } from 'react';
import { resolveAvatarUrl, userHasAvatar } from '@/lib/avatar-storage';
import { getSupabaseErrorMessage } from '@/lib/supabase-errors';
import { supabase } from '@/lib/supabase';
import type { ProfileRow } from '@/lib/types/profile';

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [hasAvatar, setHasAvatar] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setHasAvatar(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [{ data, error }, avatarExists] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, username, display_name, created_at')
          .eq('id', userId)
          .single(),
        userHasAvatar(supabase, userId),
      ]);

      if (error) throw error;
      setProfile(data as ProfileRow);
      setHasAvatar(avatarExists);
    } catch (error) {
      console.error('Error fetching profile:', getSupabaseErrorMessage(error, 'Failed to fetch profile'));
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updateDisplayName = useCallback(async (displayName: string) => {
    if (!userId) return;

    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName.trim() || null })
      .eq('id', userId);

    if (error) throw error;
    await refresh();
  }, [refresh, userId]);

  const uploadAvatar = useCallback(async (uri: string, mimeType: string) => {
    if (!userId) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(mimeType)) {
      throw new Error('INVALID_IMAGE_FORMAT');
    }

    const response = await fetch(uri);
    const blob = await response.blob();

    if (blob.size > 2 * 1024 * 1024) {
      throw new Error('IMAGE_TOO_LARGE');
    }

    const filePath = `${userId}/avatar`;
    const { error } = await supabase.storage
      .from('avatars')
      .upload(filePath, blob, {
        cacheControl: '3600',
        contentType: mimeType,
        upsert: true,
      });

    if (error) throw error;
    setHasAvatar(true);
  }, [userId]);

  const getAvatarUrl = useCallback((version: number) => {
    return resolveAvatarUrl(supabase, userId, hasAvatar, version);
  }, [hasAvatar, userId]);

  return { profile, loading, hasAvatar, refresh, updateDisplayName, uploadAvatar, getAvatarUrl };
}