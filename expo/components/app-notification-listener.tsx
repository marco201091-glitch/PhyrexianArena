import { useEffect } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import { apiPost } from '@/lib/api';
import { supabase } from '@/lib/supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

let handledNotificationResponseId: string | null = null;

export function AppNotificationListener() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!user || Platform.OS === 'web') return;
    let active = true;
    const register = async () => {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Phyrexian Arena',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }
      const current = await Notifications.getPermissionsAsync();
      const permission = current.granted ? current : await Notifications.requestPermissionsAsync();
      if (!permission.granted || !active) return;
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      if (!projectId) return;
      const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      if (active) await apiPost('/api/push-tokens', { token, platform: Platform.OS });
    };
    void register().catch(() => undefined);
    return () => { active = false; };
  }, [user]);

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
        const item = event.new as { title?: string; body?: string };
        showToast([item.title, item.body].filter(Boolean).join(' · '), 'info');
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [showToast, user]);

  useEffect(() => {
    const openNotification = (response: Notifications.NotificationResponse | null) => {
      if (!response || response.notification.request.identifier === handledNotificationResponseId) return;
      handledNotificationResponseId = response.notification.request.identifier;
      const groupId = response.notification.request.content.data?.groupId;
      if (typeof groupId === 'string') router.push({ pathname: '/table/[id]', params: { id: groupId } });
    };
    void Notifications.getLastNotificationResponseAsync()
      .then(openNotification)
      .catch(() => undefined);
    const subscription = Notifications.addNotificationResponseReceivedListener(openNotification);
    return () => subscription.remove();
  }, [router]);

  return null;
}
