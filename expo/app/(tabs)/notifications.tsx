import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { useLanguage } from '@/contexts/language-context';
import { colors, radii, spacing } from '@/constants/theme';
import { apiGet, apiPatch } from '@/lib/api';

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  data: { groupId?: string };
  read_at: string | null;
  created_at: string;
};

type NotificationPreferences = {
  arena_invite: boolean;
  arena_member_joined: boolean;
  match_completed: boolean;
  push_enabled: boolean;
};

const DEFAULTS: NotificationPreferences = {
  arena_invite: true,
  arena_member_joined: true,
  match_completed: true,
  push_enabled: true,
};

export default function NotificationsScreen() {
  const { user } = useAuth();
  const { copy } = useLanguage();
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [preferences, setPreferences] = useState(DEFAULTS);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    const result = await apiGet<{ notifications: NotificationItem[]; preferences: NotificationPreferences }>('/api/notifications');
    if (result.status === 200 && result.data) {
      setItems(result.data.notifications ?? []);
      setPreferences(result.data.preferences ?? DEFAULTS);
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

  const toggle = async (key: keyof NotificationPreferences) => {
    const previous = preferences;
    const next = { ...preferences, [key]: !preferences[key] };
    setPreferences(next);
    const result = await apiPatch('/api/notifications', { action: 'preferences', preferences: { [key]: next[key] } });
    if (result.status !== 200) setPreferences(previous);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>{copy('notifications')}</Text>
        <Button label={copy('markAllRead')} onPress={() => void markAllRead()} variant="outline" size="sm" icon="checkmark-done" />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{copy('notificationPreferences')}</Text>
        {([
          ['arena_invite', 'arenaInviteNotifications'],
          ['arena_member_joined', 'memberJoinedNotifications'],
          ['match_completed', 'matchCompletedNotifications'],
          ['push_enabled', 'pushNotifications'],
        ] as const).map(([key, label]) => (
          <View key={key} style={styles.preference}>
            <Text style={styles.preferenceLabel}>{copy(label)}</Text>
            <Switch value={preferences[key]} onValueChange={() => void toggle(key)} trackColor={{ true: colors.primary, false: colors.surfaceMuted }} />
          </View>
        ))}
      </View>

      <View style={styles.list}>
        {!items.length && !refreshing ? <Text style={styles.empty}>{copy('notificationInboxEmpty')}</Text> : null}
        {items.map((item) => (
          <Pressable key={item.id} onPress={() => void openItem(item)} style={[styles.item, !item.read_at && styles.unread]}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.itemBody}>{item.body}</Text>
            <Text style={styles.time}>{new Date(item.created_at).toLocaleString()}</Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  title: { flex: 1, color: colors.foreground, fontSize: 28, fontWeight: '800' },
  card: { borderRadius: radii.xl, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.card, padding: spacing.md, marginBottom: spacing.lg },
  sectionTitle: { color: colors.foreground, fontSize: 17, fontWeight: '700', marginBottom: spacing.sm },
  preference: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  preferenceLabel: { flex: 1, color: colors.foreground },
  list: { gap: spacing.sm },
  empty: { color: colors.muted, textAlign: 'center', padding: spacing.xl },
  item: { borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.card, padding: spacing.md },
  unread: { borderColor: colors.primary, backgroundColor: 'rgba(16, 185, 129, 0.10)' },
  itemTitle: { color: colors.foreground, fontWeight: '700', marginBottom: 4 },
  itemBody: { color: colors.muted, lineHeight: 20 },
  time: { color: colors.muted, fontSize: 11, marginTop: spacing.sm },
});
