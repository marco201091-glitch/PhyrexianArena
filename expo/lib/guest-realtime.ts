import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { buildPublicCounterRealtimeTopic } from '@/lib/guest-realtime-topic';

export function subscribePublicCounterRealtime(secret: string, onState: () => void) {
  const topic = buildPublicCounterRealtimeTopic(secret);
  if (!topic) return () => undefined;
  const channel: RealtimeChannel = supabase
    .channel(topic)
    .on('broadcast', { event: 'state' }, onState)
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
