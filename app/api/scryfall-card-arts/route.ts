import { NextRequest, NextResponse } from 'next/server';
import { requireAuthOr401 } from '@/app/api/_lib/require-auth';
import { applyUserRateLimit } from '@/app/api/_lib/with-rate-limit';
import { fetchCommanderArtOptions } from '@/lib/scryfall';

export async function GET(request: NextRequest) {
  const auth = await requireAuthOr401(request);
  if (auth.response) return auth.response;

  const rateLimited = await applyUserRateLimit(auth.user, 'scryfall');
  if (rateLimited) return rateLimited;

  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');

  if (!name || name.trim().length < 2) {
    return NextResponse.json({ data: [] });
  }

  try {
    return NextResponse.json({ data: await fetchCommanderArtOptions(name) });
  } catch (error) {
    console.error('Scryfall art search error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to search card arts' },
      { status: 500 }
    );
  }
}
