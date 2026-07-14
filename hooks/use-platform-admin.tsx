'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { isAdministrator } from '@/lib/admin';
import { supabase } from '@/lib/supabase';

export function usePlatformAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [adminMode, setAdminMode] = useState(false);
  const [resolving, setResolving] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setAdminMode(false);
      setResolving(false);
      return;
    }

    if (isAdministrator(user)) {
      setAdminMode(true);
      setResolving(false);
      return;
    }

    let cancelled = false;
    setResolving(true);

    void supabase.rpc('is_admin', { p_user_id: user.id }).then(({ data, error }) => {
      if (cancelled) return;
      setAdminMode(!error && data === true);
      setResolving(false);
    });

    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  return {
    adminMode,
    loading: authLoading || resolving,
  };
}