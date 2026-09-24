import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
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
  type: 'arena_invite' | 'arena_member_joined' | 'match_completed' | 'season_completed';
  title: string;
  body: string;
  data: Record<string, unknown> & { groupId?: string; matchId?: string };
  read_at: string | null;
  created_at: string;
};

export default function NotificationsScreen() {
  const { user } = useAuth();
  const { copy, language } = useLanguage();
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [refreshing, setRefreshing] = useState(true);
  const [error, setError] = useState(false);
  const [readBusy, setReadBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user) { setRefreshing(false); return; }
    setRefreshing(true);
    setError(false);
    try {
      const result = await apiGet<{ notifications: NotificationItem[] }>('/api/notifications');
      if (result.status !== 200 || !result.data) throw new Error('notifications');
      setItems(result.data.notifications ?? []);
    } catch { setError(true); }
    finally { setRefreshing(false); }
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  const groups = useMemo(() => {
    const grouped = new Map<string, NotificationItem[]>();
    for (const item of [...items].sort((a, b) => b.created_at.localeCompare(a.created_at))) {
      const day = new Date(item.created_at).toLocaleDateString(language === 'it' ? 'it-IT' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' });
      grouped.set(day, [...(grouped.get(day) ?? []), item]);
    }
    return Array.from(grouped.entries());
  }, [items, language]);
  const markAllRead = async () => {
    setReadBusy(true);
    try {
      const result = await apiPatch('/api/notifications', { action: 'readAll' });
      if (result.status !== 200) throw new Error('notifications');
      setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() })));
    } catch { setError(true); }
    finally { setReadBusy(false); }
  };

  const openItem = async (item: NotificationItem) => {
    if (!item.read_at) {
      void apiPatch('/api/notifications', { action: 'read', id: item.id }).then((result) => { if (result.status !== 200) throw new Error('notifications'); }).catch(() => { setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, read_at: null } : entry)); setError(true); });
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, read_at: new Date().toISOString() } : entry));
    }
    if (item.type === 'arena_invite') { router.push('/(tabs)'); return; }
    if (item.data?.groupId) router.push({ pathname: '/table/[id]', params: { id: item.data.groupId, ...(item.data.matchId ? { matchId: item.data.matchId } : {}) } });
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>{copy('notifications')}</Text>
        <Button label={copy('markAllRead')} disabled={readBusy || !items.some((item) => !item.read_at)} onPress={() => void markAllRead()} variant="outline" size="sm" icon="checkmark-done" />
        <Button label={language === 'it' ? 'Aggiorna' : 'Refresh'} disabled={refreshing} icon="refresh-outline" variant="ghost" size="sm" onPress={() => void load()} />
      </View>

      <View style={styles.list}>
        {refreshing ? <ActivityIndicator accessibilityLabel={language === 'it' ? 'Caricamento notifiche' : 'Loading notifications'} color={colors.primaryMuted} /> : null}
        {error ? <View style={styles.item}><Text style={styles.itemBody}>{language === 'it' ? 'Impossibile aggiornare le notifiche.' : 'Could not update notifications.'}</Text><Button label={language === 'it' ? 'Riprova' : 'Retry'} onPress={() => void load()} variant="outline" /></View> : null}
        {!items.length && !refreshing && !error ? <Text style={styles.empty}>{copy('notificationInboxEmpty')}</Text> : null}
        {groups.map(([day, entries]) => <View key={day} style={styles.list}><Text style={styles.day}>{day}</Text>{entries.map((item) => {
          const localized = localizeNotification(item, language);
          const accent = item.type === 'season_completed' ? '#d946ef' : item.type === 'match_completed' ? '#f59e0b' : item.type === 'arena_invite' ? '#8b5cf6' : '#38bdf8';
          return (
            <Pressable accessibilityRole="button" accessibilityLabel={`${localized.title}. ${localized.body}`} key={item.id} onPress={() => void openItem(item)} style={[styles.item, !item.read_at && styles.unread, { borderLeftColor: accent }]}>
              <View style={styles.itemTop}><Ionicons name={item.type === 'season_completed' ? 'trophy-outline' : item.type === 'match_completed' ? 'flag-outline' : item.type === 'arena_invite' ? 'mail-open-outline' : 'people-outline'} size={23} color={accent} /><Text style={styles.itemTitle}>{localized.title}</Text>{!item.read_at ? <View style={styles.unreadDot} /> : null}</View>
              <Text style={styles.itemBody}>{localized.body}</Text>
              <Text style={styles.time}>{new Date(item.created_at).toLocaleTimeString(language === 'it' ? 'it-IT' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</Text>
            </Pressable>
          );
        })}</View>)}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  day: { color: colors.muted, fontSize: 13, fontWeight: '700', marginTop: 12 },
  header: { flexWrap: 'wrap', flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  title: { flex: 1, color: colors.foreground, fontSize: 28, fontWeight: '800' },
  list: { gap: spacing.sm },
  empty: { color: colors.muted, textAlign: 'center', padding: spacing.xl },
  item: { borderRadius: radii.lg, borderWidth: 1, borderLeftWidth: 4, borderColor: colors.borderSoft, backgroundColor: colors.card, padding: spacing.md },
  unread: { borderColor: colors.primary, backgroundColor: colors.selectionTint },
  itemTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { fontSize: 18, fontWeight: '800' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  itemTitle: { flex: 1, color: colors.foreground, fontWeight: '700', marginBottom: 4 },
  itemBody: { color: colors.muted, lineHeight: 20 },
  time: { color: colors.muted, fontSize: 11, marginTop: spacing.sm },
});
