import { apiPost } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import type { MemberDeck } from '@/lib/types/arena';

const MAX_REFRESH_DECKS = 6;

export async function refreshMissingImportedDeckImages(decks: MemberDeck[]) {
  const decksToRefresh = decks
    .filter((deck) => {
      if (deck.commander_image || !deck.commander) return false;
      return (deck.source_type === 'archidekt' || deck.source_type === 'moxfield') && Boolean(deck.source_url);
    })
    .slice(0, MAX_REFRESH_DECKS);

  if (decksToRefresh.length === 0) return;

  await Promise.all(
    decksToRefresh.map(async (deck) => {
      if (!deck.source_url) return;

      const { data, status } = await apiPost<{
        commanderImageUrl?: string | null;
        commander?: string;
        name?: string;
        bracket?: string | null;
      }>('/api/deck-import', { url: deck.source_url });

      if (status >= 400 || !data?.commanderImageUrl) return;

      await supabase
        .from('decks')
        .update({
          commander_image: data.commanderImageUrl,
          commander: data.commander || deck.commander,
          name: data.name || deck.name,
          bracket: typeof data.bracket === 'string' ? data.bracket : deck.bracket,
        })
        .eq('id', deck.id);
    }),
  );
}