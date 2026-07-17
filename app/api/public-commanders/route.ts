import { NextRequest, NextResponse } from 'next/server';
import { applyIpRateLimit } from '@/app/api/_lib/with-rate-limit';
import { searchCommanders } from '@/lib/scryfall';

export async function GET(request: NextRequest) {
  const limited = await applyIpRateLimit(request, 'publicCommanderSearch');
  if (limited) return limited;
  const query = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (query.length < 2 || query.length > 80) return NextResponse.json({ data: [] });
  try {
    return NextResponse.json({ data: await searchCommanders(query) }, {
      headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600' },
    });
  } catch {
    return NextResponse.json({ error: 'Commander search unavailable' }, { status: 502 });
  }
}
