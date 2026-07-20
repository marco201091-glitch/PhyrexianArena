import { NextResponse } from 'next/server';
import { ACCESS_LOG_RETENTION_DAYS } from '@/lib/access-log';
import { LIVE_GAME_TELEMETRY_RETENTION_DAYS } from '@/lib/live-game-telemetry';
import { FINISHED_LIVE_GAME_RETENTION_DAYS } from '@/lib/live-game-retention';
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

  const [accessLogs, telemetry, liveGames] = await Promise.all([
    adminClient.rpc('purge_old_access_logs', { p_retention_days: ACCESS_LOG_RETENTION_DAYS }),
    adminClient.rpc('purge_old_live_game_telemetry', {
      p_retention_days: LIVE_GAME_TELEMETRY_RETENTION_DAYS,
    }),
    adminClient.rpc('purge_finished_live_games', {
      p_retention_days: FINISHED_LIVE_GAME_RETENTION_DAYS,
    }),
  ]);

  if (accessLogs.error || telemetry.error || liveGames.error) {
    console.error('Technical cleanup failed:', accessLogs.error?.message ?? telemetry.error?.message ?? liveGames.error?.message);
    return NextResponse.json({ error: 'Technical log purge failed.' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    deleted: {
      accessLogs: typeof accessLogs.data === 'number' ? accessLogs.data : 0,
      liveGameTelemetry: typeof telemetry.data === 'number' ? telemetry.data : 0,
      finishedLiveGames: typeof liveGames.data === 'number' ? liveGames.data : 0,
    },
    retentionDays: ACCESS_LOG_RETENTION_DAYS,
    purgedAt: new Date().toISOString(),
  });
}
