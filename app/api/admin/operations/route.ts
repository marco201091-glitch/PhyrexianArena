import { NextResponse } from 'next/server';
import packageJson from '@/package.json';
import { isPlatformAdministrator } from '@/lib/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isPlatformAdministrator(supabase, user))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const admin = getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: 'Server unavailable' }, { status: 503 });

  const startedAt = Date.now();
  const databaseResult = await admin.from('profiles').select('id', { head: true }).limit(1);
  const databaseLatencyMs = Date.now() - startedAt;
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1_000).toISOString();
  const [accessResult, deliveryResult, configResult] = await Promise.all([
    admin.from('access_logs').select('source, app_version').gte('accessed_at', since).limit(10_000),
    admin.from('notification_delivery_attempts').select('status').gte('attempted_at', new Date(Date.now() - 24 * 60 * 60 * 1_000).toISOString()).limit(10_000),
    admin.from('app_runtime_configuration').select('minimum_supported_version, recommended_version, feature_flags, updated_at').eq('id', true).maybeSingle(),
  ]);

  const versions: Record<string, number> = {};
  let webVisits = 0;
  for (const row of accessResult.data ?? []) {
    if (row.source === 'web') webVisits += 1;
    if (row.source === 'app' && row.app_version) versions[row.app_version] = (versions[row.app_version] ?? 0) + 1;
  }
  const deliveries: Record<string, number> = {};
  for (const row of deliveryResult.data ?? []) deliveries[row.status] = (deliveries[row.status] ?? 0) + 1;

  return NextResponse.json({
    backend: { version: packageJson.version, commit: process.env.GIT_COMMIT_SHA || 'unknown' },
    database: { ok: !databaseResult.error, latencyMs: databaseLatencyMs },
    expectedLatestMigration: '20260829093212_app_runtime_configuration.sql',
    runtimeConfiguration: configResult.data ?? null,
    clientAdoption30d: { appVersions: versions, webVisits, queryLimited: (accessResult.data?.length ?? 0) === 10_000 },
    notificationDeliveries24h: { counts: deliveries, available: !deliveryResult.error },
    backupLastSuccessAt: process.env.SUPABASE_BACKUP_LAST_SUCCESS_AT || null,
  }, { headers: { 'Cache-Control': 'no-store' } });
}
