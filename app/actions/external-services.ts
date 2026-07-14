'use server';

import { applyUserRateLimitById } from '@/app/actions/_lib/rate-limit';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { buildCanonicalDeckSourceUrl, extractDeckId } from '@/lib/deck-importers';
import { fetchDeckFromSource } from '@/lib/deck-importers-server';
import { searchCommanders } from '@/lib/scryfall';

export type DeckImportActionResult =
  | {
      ok: true;
      data: {
        name: string;
        commander: string;
        commanderImageUrl: string | null;
        commanderOptions: unknown;
        colorIdentity: string[];
        bracket: string | null;
        sourceUrl: string;
        sourceType: string;
      };
    }
  | { ok: false; error: string };

export async function importDeckFromUrlAction(url: string): Promise<DeckImportActionResult> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: 'Authentication required' };
  }

  const rateLimited = await applyUserRateLimitById(user.id, 'deckImport');
  if (rateLimited) {
    return { ok: false, error: 'Too many requests. Try again later.' };
  }

  if (!url || typeof url !== 'string') {
    return { ok: false, error: 'Deck URL is required' };
  }

  const parsed = extractDeckId(url);
  if (!parsed) {
    return { ok: false, error: 'Invalid URL. Must be a public Archidekt or Moxfield deck link.' };
  }

  try {
    const deckData = await fetchDeckFromSource(parsed.source, parsed.deckId);
    return {
      ok: true,
      data: {
        name: deckData.name,
        commander: deckData.commander,
        commanderImageUrl: deckData.commanderImageUrl,
        commanderOptions: deckData.commanderOptions,
        colorIdentity: deckData.colorIdentity,
        bracket: deckData.bracket,
        sourceUrl: buildCanonicalDeckSourceUrl(parsed.source, parsed.deckId),
        sourceType: parsed.source,
      },
    };
  } catch {
    return { ok: false, error: 'Failed to import deck.' };
  }
}

export type CommanderSearchActionResult =
  | { ok: true; data: Awaited<ReturnType<typeof searchCommanders>> }
  | { ok: false; error: string };

export async function searchCommandersAction(query: string): Promise<CommanderSearchActionResult> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: 'Authentication required' };
  }

  const rateLimited = await applyUserRateLimitById(user.id, 'scryfall');
  if (rateLimited) {
    return { ok: false, error: 'Too many requests. Try again later.' };
  }

  if (!query?.trim()) {
    return { ok: true, data: [] };
  }

  try {
    const results = await searchCommanders(query.trim());
    return { ok: true, data: results };
  } catch {
    return { ok: false, error: 'Failed to search commanders.' };
  }
}