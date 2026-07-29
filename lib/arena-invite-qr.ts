const INVITE_CODE_PATTERN = /^[a-z0-9_-]{4,32}$/i;

export function normalizeInviteCode(value: string | null | undefined) {
  const code = value?.trim();
  return code && INVITE_CODE_PATTERN.test(code) ? code : null;
}

export * from '@/expo/lib/arena-invite-qr';
