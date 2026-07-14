import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { ArenaGroup } from '@/lib/types/group';
import { loadGroupsCache, saveGroupsCache } from '@/lib/arena-cache';

export function useGroups(userId: string | undefined) {
  const [groups, setGroups] = useState<ArenaGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (showLoading = true) => {
    if (!userId) {
      setGroups([]);
      setLoading(false);
      return;
    }

    if (showLoading) setLoading(true);
    try {
      const { data: memberData, error: memberError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', userId);

      if (memberError) throw memberError;

      if (!memberData || memberData.length === 0) {
        setGroups([]);
        await saveGroupsCache(userId, []);
        return;
      }

      const groupIds = memberData.map((row) => row.group_id).filter(Boolean) as string[];

      const { data, error } = await supabase
        .from('groups')
        .select(`
          *,
          profiles:created_by (username, display_name),
          group_members (user_id)
        `)
        .in('id', groupIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const loadedGroups = (data as ArenaGroup[]) || [];
      setGroups(loadedGroups);
      await saveGroupsCache(userId, loadedGroups);
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setGroups([]);
    setLoading(true);
    void (async () => {
      const cached = await loadGroupsCache(userId);
      if (cancelled) return;
      if (cached) {
        setGroups(cached);
        setLoading(false);
      }
      await refresh(!cached);
    })();
    return () => { cancelled = true; };
  }, [refresh, userId]);

  return { groups, loading, refresh, setGroups };
}
