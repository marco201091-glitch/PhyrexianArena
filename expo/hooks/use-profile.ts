import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabaseErrorMessage } from '@/lib/supabase-errors';
import { supabase } from '@/lib/supabase';
import type { ProfileRow } from '@/lib/types/profile';

export function useProfile(userId: string | undefined) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ['profile', userId] as const, [userId]);
  const {
    data: profileData,
    isPending,
    refetch,
  } = useQuery<ProfileRow>({
    queryKey,
    enabled: Boolean(userId),
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, created_at, archidekt_username, archidekt_auto_import, archidekt_last_sync_at')
        .eq('id', userId!)
        .single();
      if (error) throw error;
      return data as ProfileRow;
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

  return {
    profile: profileData ?? null,
    loading: Boolean(userId) && isPending,
    refresh,
    updateDisplayName,
  };
}
