import { useSyncExternalStore } from 'react';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { appAlertStore, dismissAppAlert } from '@/lib/app-alert';

export function AppAlertHost() {
  const alert = useSyncExternalStore(
    appAlertStore.subscribe,
    appAlertStore.getSnapshot,
    appAlertStore.getSnapshot,
  );

  if (!alert) return null;
  const destructive = alert.buttons.some((button) => button.style === 'destructive');
  const normalizedTitle = alert.title.toLocaleLowerCase();
  const error = destructive || /error|errore|failed|impossibile/.test(normalizedTitle);

  return (
    <ConfirmModal
      visible
      title={alert.title}
      message={alert.message}
      tone={error ? 'danger' : 'default'}
      icon={error ? 'warning-outline' : 'information-circle-outline'}
      onClose={dismissAppAlert}
      actions={alert.buttons.map((button) => ({
        label: button.text || 'OK',
        variant: button.style === 'destructive'
          ? 'destructive'
          : button.style === 'cancel'
            ? 'ghost'
            : 'primary',
        onPress: () => {
          dismissAppAlert();
          void button.onPress?.();
        },
      }))}
    />
  );
}
