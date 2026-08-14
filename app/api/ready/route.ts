import { NextResponse } from 'next/server';
import packageJson from '@/package.json';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DATABASE_TIMEOUT_MS = 2_000;

async function checkDatabase() {
  const startedAt = Date.now();
  const adminClient = getSupabaseAdminClient();

  if (!adminClient) {
    return { ok: false, status: 'not_configured', latencyMs: Date.now() - startedAt };
  }

  try {
    const { error } = await adminClient
      .from('profiles')
      .select('id', { head: true })
      .limit(1)
      .abortSignal(AbortSignal.timeout(DATABASE_TIMEOUT_MS));

    return {
      ok: !error,
      status: error ? 'unavailable' : 'ready',
      latencyMs: Date.now() - startedAt,
    };
  } catch {
    return { ok: false, status: 'unavailable', latencyMs: Date.now() - startedAt };
  }
}

export async function GET() {
  const startedAt = Date.now();
  const database = await checkDatabase();
  const ok = database.ok;
  const latencyMs = Date.now() - startedAt;

  return NextResponse.json({
    ok,
    status: ok ? 'ready' : 'degraded',
    version: packageJson.version,
    commit: process.env.GIT_COMMIT_SHA || 'unknown',
    latencyMs,
    checks: { database },
  }, {
    status: ok ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store',
      'Server-Timing': `database;dur=${database.latencyMs}, total;dur=${latencyMs}`,
    },
  });
}
