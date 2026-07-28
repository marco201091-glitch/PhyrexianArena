'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

type AppNotification = {
  id: string;
  title: string;
  body: string;
  data: { groupId?: string };
};

export function AppNotificationListener() {
  const { user } = useAuth();
  const { toast } = useToast();
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`app-notifications:${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'app_notifications',
        filter: `user_id=eq.${user.id}`,
      }, (event) => {
        const notification = event.new as AppNotification;
        toast({
          title: notification.title,
          description: notification.body,
        });
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [toast, user]);
  return null;
}
