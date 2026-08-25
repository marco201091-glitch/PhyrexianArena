import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { PhyrexianPanel } from '@/components/ui/phyrexian-panel';
import { colors, spacing } from '@/constants/theme';
import { apiGet, apiPatch } from '@/lib/api';

type Invitation = { id: string; group_id: string; groups: { name: string } | { name: string }[] | null };
const one = <T,>(value: T | T[] | null) => Array.isArray(value) ? value[0] ?? null : value;

export function PendingArenaInvitations({
  labels,
  onAccepted,
}: {
  labels: { title: string; accept: string; decline: string };
  onAccepted: () => void;
}) {
  const [items, setItems] = useState<Invitation[]>([]);
  const load = useCallback(async () => {
    const { data, status } = await apiGet<{ invitations: Invitation[] }>('/api/arena-invitations');
    if (status === 200) setItems(data?.invitations ?? []);
  }, []);
  useEffect(() => { void load(); }, [load]);
  const respond = async (item: Invitation, action: 'accept' | 'decline') => {
    const { status } = await apiPatch('/api/arena-invitations', { invitationId: item.id, action });
    if (status !== 200) return;
    setItems((current) => current.filter((entry) => entry.id !== item.id));
    if (action === 'accept') onAccepted();
  };
  if (!items.length) return null;
  return <View style={styles.list}>{items.map((item) => <PhyrexianPanel key={item.id} style={styles.card}><Text style={styles.title}>{labels.title}: {one(item.groups)?.name}</Text><View style={styles.actions}><Button label={labels.decline} variant="outline" onPress={() => void respond(item, 'decline')} style={styles.button} /><Button label={labels.accept} onPress={() => void respond(item, 'accept')} style={styles.button} /></View></PhyrexianPanel>)}</View>;
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  card: { gap: spacing.sm, borderColor: colors.selectionBorder },
  title: { color: colors.foreground, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: spacing.sm },
  button: { flex: 1 },
});
