import { useEffect, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { ModalHeader } from '@/components/ui/modal-header';
import { QrCode } from '@/components/ui/qr-code';
import { colors, radii, spacing } from '@/constants/theme';
import { getSiteUrl } from '@/lib/env';
import { buildArenaInviteUrl } from '@/lib/invite-links';

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
  labels: { title: string; hint: string; close: string; link: string; qr: string; share: string };
}) {
  const [mode, setMode] = useState<'link' | 'qr'>('link');
  const joinUrl = buildArenaInviteUrl(getSiteUrl(), inviteCode);

  useEffect(() => {
    if (visible) setMode('link');
  }, [visible]);

  return <Modal visible={visible} onClose={onClose} presentation="dialog" maxWidth={440} scroll={false}>
    <ModalHeader title={labels.title} subtitle={arenaName} icon="qr-code-outline" onClose={onClose} />
    <View style={styles.content}>
      <View style={styles.modeRow}>
        {(['link', 'qr'] as const).map((value) => (
          <Pressable
            key={value}
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === value }}
            onPress={() => setMode(value)}
            style={[styles.modeButton, mode === value && styles.modeButtonActive]}
          >
            <Text style={[styles.modeText, mode === value && styles.modeTextActive]}>
              {value === 'link' ? labels.link : labels.qr}
            </Text>
          </Pressable>
        ))}
      </View>
      {mode === 'qr' ? (
        <>
          <QrCode value={joinUrl} size={280} label={`${labels.title}: ${arenaName}`} />
          <Text style={styles.hint}>{labels.hint}</Text>
        </>
      ) : (
        <>
          <Text style={styles.url} selectable>{joinUrl}</Text>
          <Button
            label={labels.share}
            icon="share-outline"
            onPress={() => void Share.share({ title: labels.title, message: joinUrl })}
          />
        </>
      )}
      <Button label={labels.close} onPress={onClose} />
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  content: { alignItems: 'center', gap: spacing.md },
  modeRow: { width: '100%', flexDirection: 'row', gap: spacing.xs, padding: 4, borderRadius: radii.lg, backgroundColor: colors.cardInset },
  modeButton: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md },
  modeButtonActive: { backgroundColor: colors.selectionTintStrong, borderWidth: 1, borderColor: colors.primary },
  modeText: { color: colors.muted, fontSize: 13, fontWeight: '800' },
  modeTextActive: { color: colors.foreground },
  hint: { color: colors.muted, fontSize: 13, textAlign: 'center' },
  url: { width: '100%', color: colors.primaryMuted, fontSize: 11, fontFamily: 'monospace', textAlign: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radii.md, padding: spacing.sm },
});
