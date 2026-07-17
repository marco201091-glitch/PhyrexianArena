function cleanOrigin(origin: string) {
  return origin.replace(/\/+$/, '');
}

export function buildArenaInviteUrl(origin: string, inviteCode: string) {
  return `${cleanOrigin(origin)}/join/${encodeURIComponent(inviteCode)}`;
}

export function buildGameGuestInviteUrl(origin: string, inviteToken: string) {
  return `${cleanOrigin(origin)}/game/join/${encodeURIComponent(inviteToken)}`;
}

export function buildCounterGuestInviteUrl(origin: string, inviteToken: string) {
  return `${cleanOrigin(origin)}/counter/join/${encodeURIComponent(inviteToken)}`;
}
