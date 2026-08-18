import { describe, expect, it } from 'vitest';
import { localizeNotification } from '@/lib/notification-copy';

describe('notification localization', () => {
  it('uses the selected language stored in notification data', () => {
    const item = {
      type: 'arena_invite' as const,
      title: 'Invito al playgroup',
      body: 'Testo italiano',
      data: { title_en: 'Playgroup invitation', body_en: 'English body' },
    };
    expect(localizeNotification(item, 'en')).toEqual({ title: 'Playgroup invitation', body: 'English body' });
  });

  it('does not expose legacy Italian copy in the English UI', () => {
    const localized = localizeNotification({
      type: 'match_completed', title: 'Partita conclusa', body: 'Pareggio', data: {},
    }, 'en');
    expect(localized).toEqual({ title: 'Match completed', body: 'A match has been completed.' });
  });
});
