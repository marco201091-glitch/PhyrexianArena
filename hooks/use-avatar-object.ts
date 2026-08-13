'use client';

import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getAvatarObjectState, type AvatarObjectState } from '@/lib/avatar-storage';

export function useAvatarObject(client: SupabaseClient, userId: string | undefined, version: number) {
  const [state, setState] = useState<AvatarObjectState | null>(null);

  useEffect(() => {
    setState(null);
    if (!userId) return;
    let active = true;
    void getAvatarObjectState(client, userId).then((next) => {
      if (active) setState(next);
    });
    return () => { active = false; };
  }, [client, userId, version]);

  return state;
}
