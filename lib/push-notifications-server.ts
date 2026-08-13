import type { SupabaseClient } from '@supabase/supabase-js';

export type AppNotificationType = 'arena_invite' | 'arena_member_joined' | 'match_completed';

type NotificationPreferenceRow = {
  user_id: string;
  arena_invite: boolean;
  arena_member_joined: boolean;
  match_completed: boolean;
  push_enabled: boolean;
};

type NotificationInput = {
  type: AppNotificationType;
  title: string;
  body: string;
  data?: Record<string, string>;
  dedupeKey?: string;
};

export async function notifyUsers(
  admin: SupabaseClient,
  userIds: string[],
  notification: NotificationInput,
  options: { persist?: boolean } = {},
) {
  const recipients = Array.from(new Set(userIds)).filter(Boolean);
  if (!recipients.length) return;

  // Missing preference rows mean opt-in. If an older V8 schema does not have
  // the table yet, preserve the previous behavior instead of dropping alerts.
  const preferenceResult = await admin
    .from('notification_preferences')
    .select('user_id, arena_invite, arena_member_joined, match_completed, push_enabled')
    .in('user_id', recipients);
  const preferences = preferenceResult.error
    ? new Map<string, NotificationPreferenceRow>()
    : new Map(((preferenceResult.data ?? []) as NotificationPreferenceRow[])
        .map((row) => [row.user_id, row]));
  const inboxRecipients = recipients.filter((userId) => preferences.get(userId)?.[notification.type] !== false);
  if (!inboxRecipients.length) return;

  const rows = inboxRecipients.map((userId) => ({
    user_id: userId,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    data: notification.data ?? {},
    dedupe_key: notification.dedupeKey ? `${notification.dedupeKey}:${userId}` : null,
  }));
  let pushRecipients = inboxRecipients;
  if (options.persist !== false) {
    const inserted = notification.dedupeKey
      ? await admin
          .from('app_notifications')
          .upsert(rows, { onConflict: 'dedupe_key', ignoreDuplicates: true })
          .select('user_id')
      : await admin.from('app_notifications').insert(rows);
    if (inserted.error) {
      console.error('[notifications] inbox insert failed', { code: inserted.error.code });
      return;
    }
    if (notification.dedupeKey) {
      pushRecipients = ((inserted.data ?? []) as Array<{ user_id: string }>)
        .map((row) => row.user_id);
      if (!pushRecipients.length) return;
    }
  }

  pushRecipients = pushRecipients.filter((userId) => preferences.get(userId)?.push_enabled !== false);
  if (!pushRecipients.length) return;

  const { data: tokens, error } = await admin
    .from('push_tokens')
    .select('id, expo_push_token')
    .in('user_id', pushRecipients);
  if (error || !tokens?.length) return;

  const messages = tokens.map((token) => ({
    to: token.expo_push_token,
    sound: 'default',
    title: notification.title,
    body: notification.body,
    data: { type: notification.type, ...(notification.data ?? {}) },
  }));
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  }).catch(() => null);
  if (!response?.ok) return;
  const payload = await response.json().catch(() => null) as {
    data?: Array<{ status?: string; details?: { error?: string } }>;
  } | null;
  const invalidIds = tokens
    .filter((_token, index) => payload?.data?.[index]?.details?.error === 'DeviceNotRegistered')
    .map((token) => token.id);
  if (invalidIds.length) await admin.from('push_tokens').delete().in('id', invalidIds);
}
