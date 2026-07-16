import { Image, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { ModalHeader } from '@/components/ui/modal-header';
import { colors, radii, spacing } from '@/constants/theme';
import { getApiBaseUrl, getSiteUrl } from '@/lib/env';

export function ArenaInviteQrModal({
  visible,
  inviteCode,
  arenaName,
  onClose,
  labels,
}: {
  visible: boolean;
  inviteCode: string;
  arenaName: string;
  onClose: () => void;
  labels: { title: string; hint: string; close: string };
}) {
  const imageUrl = `${getApiBaseUrl()}/api/invite-qr?code=${encodeURIComponent(inviteCode)}&format=png`;
  const joinUrl = `${getSiteUrl()}/join/${encodeURIComponent(inviteCode)}`;
  return <Modal visible={visible} onClose={onClose} presentation="dialog" maxWidth={440} scroll={false}>
    <ModalHeader title={labels.title} subtitle={arenaName} icon="qr-code-outline" onClose={onClose} />
    <View style={styles.content}>
      <Image source={{ uri: imageUrl }} style={styles.qr} alt={`${labels.title}: ${arenaName}`} accessibilityLabel={`${labels.title}: ${arenaName}`} />
      <Text style={styles.hint}>{labels.hint}</Text>
      <Text style={styles.url} selectable>{joinUrl}</Text>
      <Button label={labels.close} onPress={onClose} />
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  content: { alignItems: 'center', gap: spacing.md },
  qr: { width: 280, height: 280, maxWidth: '100%', borderRadius: radii.lg, backgroundColor: '#fff' },
  hint: { color: colors.muted, fontSize: 13, textAlign: 'center' },
  url: { width: '100%', color: colors.primaryMuted, fontSize: 11, fontFamily: 'monospace', textAlign: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radii.md, padding: spacing.sm },
});
