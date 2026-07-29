import { useEffect } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import type * as ExpoNotifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import { apiPost } from '@/lib/api';
import { supabase } from '@/lib/supabase';

let handledNotificationResponseId: string | null = null;
let notificationsPromise: Promise<typeof ExpoNotifications | null> | null = null;

function getNotificationsModule() {
  if (!notificationsPromise) {
    notificationsPromise = import('expo-notifications')
      .then((notifications) => {
        notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: false,
            shouldSetBadge: false,
          }),
        });
        return notifications;
      })
      .catch(() => null);
  }
  return notificationsPromise;
}

export function AppNotificationListener() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!user || Platform.OS === 'web') return;
    let active = true;
    const register = async () => {
      const Notifications = await getNotificationsModule();
      if (!Notifications || !active) return;
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Tracker & Analytics',
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
    let subscription: ExpoNotifications.EventSubscription | null = null;
    let active = true;
    const openNotification = (response: ExpoNotifications.NotificationResponse | null) => {
      if (!response || response.notification.request.identifier === handledNotificationResponseId) return;
      handledNotificationResponseId = response.notification.request.identifier;
      const groupId = response.notification.request.content.data?.groupId;
      if (typeof groupId === 'string') router.push({ pathname: '/table/[id]', params: { id: groupId } });
    };
    void getNotificationsModule().then((Notifications) => {
      if (!Notifications || !active) return;
      void Notifications.getLastNotificationResponseAsync()
        .then(openNotification)
        .catch(() => undefined);
      subscription = Notifications.addNotificationResponseReceivedListener(openNotification);
    });
    return () => {
      active = false;
      subscription?.remove();
    };
  }, [router]);

  return null;
}
