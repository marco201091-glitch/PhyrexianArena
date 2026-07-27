import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export function GET() {
  const siteKey = process.env['NEXT_PUBLIC_TURNSTILE_SITE_KEY'] || '';
  if (!siteKey) {
    return NextResponse.json({ error: 'Turnstile is not configured' }, {
      status: 503,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
  return NextResponse.json({ siteKey }, { headers: { 'Cache-Control': 'no-store' } });
}
