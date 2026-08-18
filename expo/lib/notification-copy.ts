export type NotificationLanguage = 'en' | 'it';

export type LocalizableNotification = {
  type?: 'arena_invite' | 'arena_member_joined' | 'match_completed';
  title: string;
  body: string;
  data?: Record<string, unknown> | null;
};

export function localizeNotification(item: LocalizableNotification, language: NotificationLanguage) {
  const data = item.data ?? {};
  const title = data[`title_${language}`];
  const body = data[`body_${language}`];
  if (typeof title === 'string' && typeof body === 'string') return { title, body };
  if (language === 'it') return { title: item.title, body: item.body };

  const fallback = {
    arena_invite: { title: 'Playgroup invitation', body: 'You received a new playgroup invitation.' },
    arena_member_joined: { title: 'New playgroup member', body: 'A new member joined your playgroup.' },
    match_completed: { title: 'Match completed', body: 'A match has been completed.' },
  } as const;
  return item.type ? fallback[item.type] : { title: 'Notification', body: '' };
}
