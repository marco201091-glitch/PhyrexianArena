import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { ModalHeader } from '@/components/ui/modal-header';
import { colors, radii, spacing } from '@/constants/theme';

type ConfirmAction = {
  label: string;
  variant?: 'primary' | 'ghost' | 'outline' | 'destructive';
  onPress: () => void;
};

type ConfirmModalProps = {
  visible: boolean;
  title: string;
  message?: string;
  actions: ConfirmAction[];
  onClose: () => void;
  icon?: ComponentProps<typeof ModalHeader>['icon'];
  tone?: ComponentProps<typeof ModalHeader>['tone'];
};

export function ConfirmModal({
  visible,
  title,
  message,
  actions,
  onClose,
  icon,
  tone,
}: ConfirmModalProps) {
  const resolvedTone = tone ?? (actions.some((action) => action.variant === 'destructive') ? 'danger' : 'default');

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      scroll={false}
      presentation="dialog"
      maxWidth={480}
      footer={(
        <View style={[styles.actions, actions.length > 2 && styles.actionsStacked]}>
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
      )}
    >
      <ModalHeader
        title={title}
        icon={icon ?? (resolvedTone === 'danger' ? 'warning-outline' : 'help-circle-outline')}
        tone={resolvedTone}
        onClose={onClose}
      />
      {message ? (
        <View style={styles.messageCard}>
          <Text style={styles.message}>{message}</Text>
        </View>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  messageCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.cardInset,
    padding: spacing.md,
  },
  message: {
    color: colors.foreground,
    fontSize: 14,
    lineHeight: 21,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionsStacked: {
    flexDirection: 'column',
  },
  actionButton: {
    flex: 1,
  },
});
