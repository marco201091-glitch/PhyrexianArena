import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '@/components/ui/input';
import { colors, radii, spacing } from '@/constants/theme';
import { apiGet, apiPost } from '@/lib/api';

type SearchUser = { id: string; username: string; display_name: string | null };

export function DirectArenaInvite({
  groupId,
  labels,
  onMessage,
}: {
  groupId: string;
  labels: { title: string; hint: string; search: string; sent: string; failed: string };
  onMessage: (message: string, error?: boolean) => void;
}) {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setUsers([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      const { data, status } = await apiGet<{ users: SearchUser[] }>(`/api/arena-invitations?groupId=${encodeURIComponent(groupId)}&q=${encodeURIComponent(query.trim())}`);
      setUsers(status === 200 ? data?.users ?? [] : []);
      setLoading(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [groupId, query]);

  const invite = async (user: SearchUser) => {
    setInviting(user.id);
    const { status, error } = await apiPost('/api/arena-invitations', { groupId, userId: user.id });
    setInviting(null);
    if (status !== 200) {
      onMessage(error || labels.failed, true);
      return;
    }
    onMessage(labels.sent);
    setQuery('');
    setUsers([]);
  };

  return <View style={styles.panel}>
    <Text style={styles.title}>{labels.title}</Text>
    <Text style={styles.hint}>{labels.hint}</Text>
    <Input value={query} onChangeText={setQuery} placeholder={labels.search} icon="search-outline" />
    {loading ? <ActivityIndicator color={colors.primaryMuted} /> : null}
    {users.map((user) => <View key={user.id} style={styles.userRow}><View style={styles.copy}><Text style={styles.name}>{user.display_name || user.username}</Text><Text style={styles.username}>@{user.username}</Text></View><Pressable style={styles.inviteButton} onPress={() => void invite(user)} disabled={inviting === user.id} accessibilityRole="button" accessibilityLabel={`${labels.title}: ${user.display_name || user.username}`}>{inviting === user.id ? <ActivityIndicator color={colors.primaryMuted} /> : <Ionicons name="send-outline" size={20} color={colors.primaryMuted} />}</Pressable></View>)}
  </View>;
}

const styles = StyleSheet.create({
  panel: { gap: spacing.sm, marginTop: spacing.sm, borderRadius: radii.md, borderWidth: 1, borderColor: colors.selectionBorder, backgroundColor: colors.selectionTint, padding: spacing.md },
  title: { color: colors.foreground, fontSize: 14, fontWeight: '800' },
  hint: { color: colors.muted, fontSize: 11, lineHeight: 15 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radii.md, backgroundColor: colors.cardInset, padding: spacing.sm },
  copy: { flex: 1 },
  name: { color: colors.foreground, fontWeight: '700' },
  username: { color: colors.muted, fontSize: 11 },
  inviteButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: colors.cardInset },
});
