export function buildPublicCounterRealtimeTopic(secret: string) {
  if (!/^[a-f0-9]{48}$/.test(secret)) return null;
  return `counter:${secret}`;
}
