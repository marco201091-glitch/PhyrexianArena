import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { colors, spacing } from '@/constants/theme';

type ConfirmAction = {
  label: string;
  variant?: 'primary' | 'ghost' | 'destructive';
  onPress: () => void;
};

type ConfirmModalProps = {
  visible: boolean;
  title: string;
  message: string;
  actions: ConfirmAction[];
  onClose: () => void;
};

export function ConfirmModal({
  visible,
  title,
  message,
  actions,
  onClose,
}: ConfirmModalProps) {
  return (
    <Modal visible={visible} onClose={onClose} scroll={false}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      <View style={styles.actions}>
        {actions.map((action, index) => (
          <Button
            key={`${action.label}-${index}`}
            label={action.label}
            variant={action.variant ?? (index === actions.length - 1 ? 'primary' : 'ghost')}
            onPress={action.onPress}
            style={styles.actionButton}
          />
        ))}
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
  message: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  actionButton: {
    width: '100%',
  },
});