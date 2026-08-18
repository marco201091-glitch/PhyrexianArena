import { describe, expect, it } from 'vitest';
import { localizeNotification } from '@/lib/notification-copy';

describe('notification localization', () => {
  it('renders localized notification data and protects English from legacy Italian rows', () => {
    expect(localizeNotification({
      type: 'arena_invite', title: 'Invito', body: 'Italiano',
      data: { title_en: 'Invitation', body_en: 'English' },
    }, 'en')).toEqual({ title: 'Invitation', body: 'English' });
    expect(localizeNotification({
      type: 'arena_invite', title: 'Invito', body: 'Italiano', data: {},
    }, 'en').title).toBe('Playgroup invitation');
  });
});
