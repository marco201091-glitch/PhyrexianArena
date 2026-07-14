import { type NextRequest, NextResponse } from 'next/server';
import { getCanonicalRedirectUrl } from '@/lib/canonical-host';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  if (process.env.VERCEL_ENV !== 'preview') {
    const canonicalRedirect = getCanonicalRedirectUrl(request.nextUrl);
    if (canonicalRedirect) {
      return NextResponse.redirect(canonicalRedirect, 308);
    }
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};