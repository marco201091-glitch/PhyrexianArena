import { NextRequest, NextResponse } from 'next/server';
import { requireAuthOr401 } from '@/app/api/_lib/require-auth';
import { applyUserRateLimit } from '@/app/api/_lib/with-rate-limit';
import { searchCommanders, type CommanderPartnerMode } from '@/lib/scryfall';

export async function GET(request: NextRequest) {
  const auth = await requireAuthOr401(request);
  if (auth.response) return auth.response;

  const rateLimited = await applyUserRateLimit(auth.user, 'scryfall');
  if (rateLimited) return rateLimited;

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const partnerModeParam = searchParams.get('partnerMode');
  const validPartnerModes: CommanderPartnerMode[] = [
    'partner',
    'background',
    'background-owner',
    'friends',
    'doctor',
    'doctor-companion',
  ];
  const partnerMode = validPartnerModes.includes(partnerModeParam as CommanderPartnerMode)
    ? partnerModeParam as CommanderPartnerMode
    : null;

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ data: [] });
  }

  try {
    return NextResponse.json({ data: await searchCommanders(query, partnerMode) });
  } catch (error) {
    console.error('Scryfall search error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to search commanders' },
      { status: 500 }
    );
  }
}
