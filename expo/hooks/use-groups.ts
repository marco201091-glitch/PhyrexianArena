import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { ArenaGroup } from '@/lib/types/group';

export function useGroups(userId: string | undefined) {
  const [groups, setGroups] = useState<ArenaGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setGroups([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data: memberData, error: memberError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', userId);

      if (memberError) throw memberError;

      if (!memberData || memberData.length === 0) {
        setGroups([]);
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

      setGroups((data as ArenaGroup[]) || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { groups, loading, refresh, setGroups };
}