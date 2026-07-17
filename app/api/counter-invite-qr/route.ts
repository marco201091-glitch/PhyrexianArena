import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { applyIpRateLimit } from '@/app/api/_lib/with-rate-limit';

export async function GET(request: NextRequest) {
  const limited = await applyIpRateLimit(request, 'inviteQr');
  if (limited) return limited;
  const token = request.nextUrl.searchParams.get('token') ?? '';
  if (!/^[a-f0-9]{48}$/.test(token)) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  }
  const url = `${request.nextUrl.origin}/counter/join/${token}`;
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
