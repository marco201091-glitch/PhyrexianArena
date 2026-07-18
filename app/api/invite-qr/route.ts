import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { applyIpRateLimit } from '@/app/api/_lib/with-rate-limit';
import { buildArenaJoinUrl, normalizeInviteCode } from '@/lib/arena-invite-qr';

export async function GET(request: NextRequest) {
  const limited = await applyIpRateLimit(request, 'inviteQr');
  if (limited) return limited;

  const code = normalizeInviteCode(request.nextUrl.searchParams.get('code'));
  if (!code) return NextResponse.json({ error: 'Invalid invite code' }, { status: 400 });

  const joinUrl = buildArenaJoinUrl(request.nextUrl.origin, code);
  if (request.nextUrl.searchParams.get('format') === 'png') {
    const png = await QRCode.toBuffer(joinUrl, {
      type: 'png',
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 560,
      color: { dark: '#09090b', light: '#ffffff' },
    });
    return new NextResponse(new Uint8Array(png), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }

  const svg = await QRCode.toString(joinUrl, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 2,
    color: { dark: '#09090b', light: '#ffffff' },
  });
  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
