import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

export type GuestRealtimeScope = 'game' | 'counter';

export function buildGuestRealtimeTopic(scope: GuestRealtimeScope, secret: string) {
  if (!/^[a-f0-9]{48}$/.test(secret)) throw new Error('Invalid realtime topic');
  return `${scope}:${secret}`;
}

export function subscribeGuestRealtime(
  client: SupabaseClient,
  input: {
    scope: GuestRealtimeScope;
    secret: string;
    onState: () => void;
  },
) {
  const topic = buildGuestRealtimeTopic(input.scope, input.secret);
  const channel: RealtimeChannel = client
    .channel(topic)
    .on('broadcast', { event: 'state' }, input.onState)
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}
