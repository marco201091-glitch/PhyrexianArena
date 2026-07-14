import { afterEach, describe, expect, it, vi } from 'vitest';
import { appAlertStore, dismissAppAlert, showAppAlert } from '@/lib/app-alert';

describe('app alert store', () => {
  afterEach(dismissAppAlert);

  it('publishes a default action for simple alerts', () => {
    const listener = vi.fn();
    const unsubscribe = appAlertStore.subscribe(listener);
    showAppAlert('Saved', 'Everything is ready');
    expect(appAlertStore.getSnapshot()).toMatchObject({
      title: 'Saved',
      message: 'Everything is ready',
      buttons: [{ text: 'OK' }],
    });
    expect(listener).toHaveBeenCalledOnce();
    unsubscribe();
  });

  it('preserves destructive and cancel actions', () => {
    showAppAlert('Delete?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive' },
    ]);
    expect(appAlertStore.getSnapshot()?.buttons.map((button) => button.style))
      .toEqual(['cancel', 'destructive']);
  });
});
