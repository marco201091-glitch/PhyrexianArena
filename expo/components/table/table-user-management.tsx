import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CollapsiblePanel } from '@/components/ui/collapsible-panel';
import { DirectArenaInvite } from '@/components/table/direct-arena-invite';
import { colors } from '@/constants/theme';
import { getProfileDisplayName } from '@/lib/profile-display';
import type { ArenaProfile } from '@/lib/types/arena';

type Props = { members: ArenaProfile[]; groupId: string; creatorId: string; userId?: string; canKick: (id: string) => boolean; onKick: (id: string, name: string) => void; labels: { title: string; creator: string; you: string; inviteTitle: string; inviteHint: string; search: string; sent: string; failed: string }; onMessage: (message: string, error?: boolean) => void };
export function TableUserManagement({ members, groupId, creatorId, userId, canKick, onKick, labels, onMessage }: Props) {
  return <CollapsiblePanel title={labels.title} meta={`${members.length}`}>
    {members.map((member) => <View key={member.id} style={styles.row}>
      <View style={styles.info}><Text style={styles.name}>{getProfileDisplayName(member)}</Text><View style={styles.badges}>
        {member.id === creatorId ? <Text style={styles.badge}>{labels.creator}</Text> : null}
        {member.id === userId ? <Text style={styles.badge}>{labels.you}</Text> : null}
      </View></View>
      {canKick(member.id) ? <Pressable onPress={() => onKick(member.id, getProfileDisplayName(member))}><Ionicons name="person-remove-outline" size={20} color={colors.muted} /></Pressable> : null}
    </View>)}
    <DirectArenaInvite groupId={groupId} labels={{ title: labels.inviteTitle, hint: labels.inviteHint, search: labels.search, sent: labels.sent, failed: labels.failed }} onMessage={onMessage} />
  </CollapsiblePanel>;
}
const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }, info: { flex: 1 }, name: { color: colors.foreground, fontSize: 14, fontWeight: '600' }, badges: { flexDirection: 'row', gap: 8 }, badge: { color: colors.primaryMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' } });
