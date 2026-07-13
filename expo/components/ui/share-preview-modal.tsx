import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { colors } from '@/constants/theme';

type SharePreviewModalProps = {
  visible: boolean;
  title: string;
  preview: string;
  previewLabel: string;
  shareLabel: string;
  cancelLabel: string;
  onClose: () => void;
  onShare: () => void;
  sharing?: boolean;
  sharingLabel?: string;
};

export function SharePreviewModal({
  visible,
  title,
  preview,
  previewLabel,
  shareLabel,
  cancelLabel,
  onClose,
  onShare,
  sharing = false,
  sharingLabel = '...',
}: SharePreviewModalProps) {
  return (
    <Modal visible={visible} onClose={onClose}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.previewLabel}>{previewLabel}</Text>
      <ScrollView style={styles.previewScroll} nestedScrollEnabled>
        <View style={styles.previewBox}>
          <Text style={styles.previewText} selectable>
            {preview}
          </Text>
        </View>
      </ScrollView>
      <View style={styles.actions}>
        <Button label={cancelLabel} variant="ghost" onPress={onClose} style={styles.action} />
        <Button
          label={sharing ? sharingLabel : shareLabel}
          onPress={onShare}
          disabled={sharing || !preview.trim()}
          style={styles.action}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.foreground,
    fontSize: 20,
    fontWeight: '700',
  },
  previewLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewScroll: {
    maxHeight: 280,
  },
  previewBox: {
    backgroundColor: colors.cardInset,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: 14,
  },
  previewText: {
    color: colors.foreground,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'monospace',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  action: {
    flex: 1,
  },
});