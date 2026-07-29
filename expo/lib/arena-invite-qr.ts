export function buildArenaJoinUrl(origin: string, inviteCode: string): string {
  return `${origin.replace(/\/+$/, '')}/join/${encodeURIComponent(inviteCode)}`;
}
