import { NextRequest, NextResponse } from 'next/server';
import { requireAuthOr401 } from '@/app/api/_lib/require-auth';
import { applyUserRateLimit } from '@/app/api/_lib/with-rate-limit';
import { buildCanonicalDeckSourceUrl } from '@/lib/deck-importers';
import { fetchFromArchidekt } from '@/lib/deck-importers-server';

interface ArchidektDeckSummary {
  id: number;
  name: string;
  private?: boolean;
  unlisted?: boolean;
  featured?: string | null;
  customFeatured?: string | null;
}

interface ArchidektDeckSearchResponse {
  results?: ArchidektDeckSummary[];
}

const MAX_IMPORTABLE_DECKS = 80;
const ARCHIDEKT_IMPORT_CONCURRENCY = 3;

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
) {
  const results: R[] = [];

  for (let index = 0; index < items.length; index += concurrency) {
    const batch = items.slice(index, index + concurrency);
    const batchResults = await Promise.all(batch.map(mapper));
    results.push(...batchResults);
  }

  return results;
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthOr401(request);
  if (auth.response) return auth.response;

  const rateLimited = await applyUserRateLimit(auth.user, 'archidektUserDecks');
  if (rateLimited) return rateLimited;

  try {
    const { username } = await request.json();

    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: 'Archidekt username is required' }, { status: 400 });
    }

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      return NextResponse.json({ error: 'Archidekt username is required' }, { status: 400 });
    }

    const searchUrl = new URL('https://archidekt.com/api/decks/v3/');
    searchUrl.searchParams.set('ownerUsername', cleanUsername);
    searchUrl.searchParams.set('deckFormat', '3');
    searchUrl.searchParams.set('orderBy', '-updatedAt');
    searchUrl.searchParams.set('pageSize', String(MAX_IMPORTABLE_DECKS));

    const response = await fetch(searchUrl.toString(), {
      headers: { accept: 'application/json' },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch Archidekt user decks' }, { status: response.status });
    }

    const data = await response.json() as ArchidektDeckSearchResponse;
    const publicDecks = (data.results || [])
      .filter((deck) => deck.id && deck.private !== true)
      .slice(0, MAX_IMPORTABLE_DECKS);

    const importedDecks = await mapWithConcurrency(
      publicDecks,
      ARCHIDEKT_IMPORT_CONCURRENCY,
      async (deck) => {
        const sourceUrl = buildCanonicalDeckSourceUrl('archidekt', String(deck.id));

        try {
          const deckData = await fetchFromArchidekt(String(deck.id));
          return {
            id: String(deck.id),
            name: deckData.name || deck.name,
            commander: deckData.commander,
            commanderImageUrl: deckData.commanderImageUrl,
            commanderOptions: deckData.commanderOptions,
            bracket: deckData.bracket,
            colorIdentity: deckData.colorIdentity,
            sourceUrl,
            sourceType: 'archidekt',
          };
        } catch (error) {
          return {
            id: String(deck.id),
            name: deck.name,
            commander: deck.name,
            commanderImageUrl: deck.customFeatured || deck.featured || null,
            commanderOptions: [],
            bracket: null,
            colorIdentity: [],
            sourceUrl,
            sourceType: 'archidekt',
            warning: error instanceof Error ? error.message : 'Failed to import deck details',
          };
        }
      },
    );

    return NextResponse.json({
      username: cleanUsername,
      decks: importedDecks,
      skippedPrivateCount: Math.max(0, (data.results || []).length - publicDecks.length),
      limit: MAX_IMPORTABLE_DECKS,
    });
  } catch (error) {
    console.error('Archidekt user import error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to import Archidekt user decks' },
      { status: 500 }
    );
  }
}
