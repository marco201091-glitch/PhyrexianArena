import { NextResponse } from 'next/server';
import {
  fetchAccessLogsForAdmin,
  normalizeAccessLogLimit,
  normalizeAccessLogPeriod,
} from '@/lib/access-log-query';
import { isPlatformAdministrator } from '@/lib/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user || !(await isPlatformAdministrator(supabase, user))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const limit = normalizeAccessLogLimit(searchParams.get('limit'));
  const period = normalizeAccessLogPeriod(searchParams.get('period'));
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  try {
    const logs = await fetchAccessLogsForAdmin(supabase, { limit, period, from, to });
    return NextResponse.json({ logs, period });
  } catch (queryError) {
    const message = queryError instanceof Error ? queryError.message : 'Failed to load access logs.';
    const status = message.includes('Invalid custom date range') ? 400 : 500;
    console.error('Failed to fetch access logs:', queryError);
    return NextResponse.json({ error: message }, { status });
  }
}