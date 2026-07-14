import { NextRequest, NextResponse } from 'next/server';
import { requireAuthOr401 } from '@/app/api/_lib/require-auth';
import { applyUserRateLimit } from '@/app/api/_lib/with-rate-limit';
import { buildCanonicalDeckSourceUrl, extractDeckId } from '@/lib/deck-importers';
import { fetchDeckFromSource } from '@/lib/deck-importers-server';

export async function POST(request: NextRequest) {
  const auth = await requireAuthOr401(request);
  if (auth.response) return auth.response;

  const rateLimited = await applyUserRateLimit(auth.user, 'deckImport');
  if (rateLimited) return rateLimited;

  try {
    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Deck URL is required' }, { status: 400 });
    }

    const parsed = extractDeckId(url);
    if (!parsed) {
      return NextResponse.json(
        { error: 'Invalid URL. Must be a public Archidekt or Moxfield deck link.' },
        { status: 400 }
      );
    }

    const deckData = await fetchDeckFromSource(parsed.source, parsed.deckId);

    return NextResponse.json({
      name: deckData.name,
      commander: deckData.commander,
      commanderImageUrl: deckData.commanderImageUrl,
      commanderOptions: deckData.commanderOptions,
      colorIdentity: deckData.colorIdentity,
      bracket: deckData.bracket,
      sourceUrl: buildCanonicalDeckSourceUrl(parsed.source, parsed.deckId),
      sourceType: parsed.source,
    });
  } catch (error) {
    console.error('Deck import error:', error);
    return NextResponse.json({ error: 'Failed to import deck.' }, { status: 500 });
  }
}