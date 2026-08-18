import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/auth-context';
import { useLanguage } from '@/contexts/language-context';
import { colors, radii } from '@/constants/theme';
import { apiGet } from '@/lib/api';
import { supabase } from '@/lib/supabase';

type Item = { id: string; read_at: string | null };

export function NotificationInboxButton() {
  const { user } = useAuth();
  const { copy } = useLanguage();
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const unread = useMemo(() => items.filter((item) => !item.read_at).length, [items]);

  const load = useCallback(async () => {
    if (!user) return;
    const result = await apiGet<{ notifications: Item[] }>('/api/notifications');
    if (result.status === 200 && result.data) setItems(result.data.notifications ?? []);
  }, [user]);

  useFocusEffect(useCallback(() => {
    void load();
    if (!user) return undefined;
    const channel = supabase.channel(`home-notifications:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_notifications', filter: `user_id=eq.${user.id}` }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load, user]));

  return (
    <Pressable
      onPress={() => router.push('/notifications')}
      accessibilityRole="button"
      accessibilityLabel={copy('notifications')}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Ionicons name="notifications-outline" size={23} color={colors.primaryMuted} />
      {unread > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{Math.min(unread, 99)}</Text></View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 48, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surfaceMuted },
  pressed: { opacity: 0.75 },
  badge: { position: 'absolute', top: -5, right: -5, minWidth: 20, height: 20, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#dc2626', borderWidth: 2, borderColor: colors.card },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
});
