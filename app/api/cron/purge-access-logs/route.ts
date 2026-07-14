import { NextResponse } from 'next/server';
import { ACCESS_LOG_RETENTION_DAYS } from '@/lib/access-log';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

function isAuthorizedCronRequest(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;

  const authHeader = request.headers.get('authorization');
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: 'Service role is not configured.' }, { status: 500 });
  }

  const { data, error } = await adminClient.rpc('purge_old_access_logs', {
    p_retention_days: ACCESS_LOG_RETENTION_DAYS,
  });

  if (error) {
    console.error('Access log purge failed:', error.message);
    return NextResponse.json({ error: 'Access log purge failed.' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    deleted: typeof data === 'number' ? data : 0,
    retentionDays: ACCESS_LOG_RETENTION_DAYS,
    purgedAt: new Date().toISOString(),
  });
}