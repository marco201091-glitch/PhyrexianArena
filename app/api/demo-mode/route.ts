import { NextResponse } from 'next/server';
import { isDemoModeEnabled } from '@/lib/demo';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({ enabled: isDemoModeEnabled() });
}