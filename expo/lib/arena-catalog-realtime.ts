import type { SupabaseClient } from '@supabase/supabase-js';

export type ArenaCatalogEntity = 'deck' | 'member' | 'guest' | 'guest_deck';

export type ArenaCatalogEvent = {
  entity: ArenaCatalogEntity;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  id: string;
};

export function subscribeToArenaCatalog(
  client: SupabaseClient,
  groupId: string,
  onChange: (event: ArenaCatalogEvent) => void,
): () => void {
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let latestEvent: ArenaCatalogEvent | null = null;
  const channel = client
    .channel(`arena:${groupId}:catalog`, { config: { private: true } })
    .on('broadcast', { event: 'catalog_changed' }, ({ payload }) => {
      latestEvent = payload as ArenaCatalogEvent;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        if (!disposed && latestEvent) onChange(latestEvent);
      }, 120);
    });

  void client.realtime.setAuth().then(() => {
    if (!disposed) channel.subscribe();
  });

  return () => {
    disposed = true;
    if (timer) clearTimeout(timer);
    void client.removeChannel(channel);
  };
}
