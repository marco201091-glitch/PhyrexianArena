import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { applyIpRateLimit } from '@/app/api/_lib/with-rate-limit';
import { REMOTE_GUESTS_ENABLED } from '@/lib/feature-flags';

export async function GET(request: NextRequest) {
  if (!REMOTE_GUESTS_ENABLED) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const limited = await applyIpRateLimit(request, 'inviteQr');
  if (limited) return limited;
  const token = request.nextUrl.searchParams.get('token') ?? '';
  if (!/^[a-f0-9]{48}$/.test(token)) return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  const url = `${request.nextUrl.origin}/game/join/${token}`;
  if (request.nextUrl.searchParams.get('format') === 'png') {
    const png = await QRCode.toBuffer(url, {
      type: 'png',
      width: 560,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#09090b', light: '#ffffff' },
    });
    return new NextResponse(new Uint8Array(png), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }
  const svg = await QRCode.toString(url, { type: 'svg', width: 560, margin: 2, errorCorrectionLevel: 'M' });
  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'private, no-store',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
