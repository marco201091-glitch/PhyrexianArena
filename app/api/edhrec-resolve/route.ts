import { NextRequest, NextResponse } from 'next/server';
import { requireAuthOr401 } from '@/app/api/_lib/require-auth';
import { applyUserRateLimit } from '@/app/api/_lib/with-rate-limit';
import { resolveEdhrecCommanderSlug } from '@/lib/edhrec';

export async function GET(request: NextRequest) {
  const auth = await requireAuthOr401(request);
  if (auth.response) return auth.response;

  const rateLimited = await applyUserRateLimit(auth.user, 'edhrec');
  if (rateLimited) return rateLimited;

  const commander = request.nextUrl.searchParams.get('commander')?.trim();
  if (!commander || commander.length < 2) {
    return NextResponse.json({ slug: null });
  }

  try {
    const slug = await resolveEdhrecCommanderSlug(commander);
    return NextResponse.json(
      { slug },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
        },
      },
    );
  } catch (error) {
    console.error('EDHREC slug resolve error:', error);
    return NextResponse.json({ slug: null });
  }
}