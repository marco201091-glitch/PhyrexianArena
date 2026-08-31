import { beforeEach, describe, expect, it, vi } from 'vitest';

const { impactAsync, notificationAsync } = vi.hoisted(() => ({
  impactAsync: vi.fn(),
  notificationAsync: vi.fn(),
}));

vi.mock('expo-haptics', () => ({
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning' },
  impactAsync,
  notificationAsync,
}));

vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

import { hapticLight, hapticMedium, hapticSuccess, hapticWarning } from '@/lib/haptics';

describe('iOS haptics', () => {
  beforeEach(() => {
    impactAsync.mockReset();
    notificationAsync.mockReset();
  });

  it('uses the expected feedback styles', async () => {
    await hapticLight();
    await hapticMedium();
    await hapticSuccess();
    await hapticWarning();

    expect(impactAsync).toHaveBeenCalledWith('light');
    expect(impactAsync).toHaveBeenCalledWith('medium');
    expect(notificationAsync).toHaveBeenNthCalledWith(1, 'success');
    expect(notificationAsync).toHaveBeenNthCalledWith(2, 'warning');
  });

  it('does not reject when haptics are unavailable', async () => {
    impactAsync.mockRejectedValueOnce(new Error('unsupported'));
    notificationAsync.mockRejectedValue(new Error('unsupported'));

    await expect(hapticLight()).resolves.toBeUndefined();
    await expect(hapticMedium()).resolves.toBeUndefined();
    await expect(hapticSuccess()).resolves.toBeUndefined();
    await expect(hapticWarning()).resolves.toBeUndefined();
  });
});
