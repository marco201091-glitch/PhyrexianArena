import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { useLanguage } from '@/contexts/language-context';
import { colors, radii, spacing } from '@/constants/theme';
import { apiGet, apiPatch } from '@/lib/api';
import { localizeNotification } from '@/lib/notification-copy';

type NotificationItem = {
  id: string;
  type: 'arena_invite' | 'arena_member_joined' | 'match_completed';
  title: string;
  body: string;
  data: Record<string, unknown> & { groupId?: string };
  read_at: string | null;
  created_at: string;
};

export default function NotificationsScreen() {
  const { user } = useAuth();
  const { copy, language } = useLanguage();
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    const result = await apiGet<{ notifications: NotificationItem[] }>('/api/notifications');
    if (result.status === 200 && result.data) {
      setItems(result.data.notifications ?? []);
    }
    setRefreshing(false);
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  const markAllRead = async () => {
    const result = await apiPatch('/api/notifications', { action: 'readAll' });
    if (result.status === 200) setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() })));
  };

  const openItem = async (item: NotificationItem) => {
    if (!item.read_at) {
      void apiPatch('/api/notifications', { action: 'read', id: item.id });
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, read_at: new Date().toISOString() } : entry));
    }
    if (item.data?.groupId) router.push({ pathname: '/table/[id]', params: { id: item.data.groupId } });
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>{copy('notifications')}</Text>
        <Button label={copy('markAllRead')} onPress={() => void markAllRead()} variant="outline" size="sm" icon="checkmark-done" />
      </View>

      <View style={styles.list}>
        {!items.length && !refreshing ? <Text style={styles.empty}>{copy('notificationInboxEmpty')}</Text> : null}
        {items.map((item) => {
          const localized = localizeNotification(item, language);
          return (
            <Pressable key={item.id} onPress={() => void openItem(item)} style={[styles.item, !item.read_at && styles.unread]}>
              <Text style={styles.itemTitle}>{localized.title}</Text>
              <Text style={styles.itemBody}>{localized.body}</Text>
              <Text style={styles.time}>{new Date(item.created_at).toLocaleString(language === 'it' ? 'it-IT' : 'en-US')}</Text>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  title: { flex: 1, color: colors.foreground, fontSize: 28, fontWeight: '800' },
  list: { gap: spacing.sm },
  empty: { color: colors.muted, textAlign: 'center', padding: spacing.xl },
  item: { borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.card, padding: spacing.md },
  unread: { borderColor: colors.primary, backgroundColor: 'rgba(16, 185, 129, 0.10)' },
  itemTitle: { color: colors.foreground, fontWeight: '700', marginBottom: 4 },
  itemBody: { color: colors.muted, lineHeight: 20 },
  time: { color: colors.muted, fontSize: 11, marginTop: spacing.sm },
});
