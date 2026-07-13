import { NextResponse } from 'next/server';
import { DEMO_ACCOUNT_EMAIL, isDemoModeEnabled } from '@/lib/demo';
import { findDemoUserId, resetAndSeedDemoAccount } from '@/lib/demo-seed';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

function isAuthorizedCronRequest(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;

  const authHeader = request.headers.get('authorization');
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  if (!isDemoModeEnabled()) {
    return NextResponse.json({ skipped: true, reason: 'demo_mode_disabled' });
  }

  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: 'Service role is not configured.' }, { status: 500 });
  }

  const demoEmail = process.env.DEMO_USER_EMAIL || DEMO_ACCOUNT_EMAIL;
  const configuredDemoUserId = process.env.DEMO_USER_ID;
  const demoUserId = configuredDemoUserId || await findDemoUserId(adminClient, demoEmail);

  if (!demoUserId) {
    return NextResponse.json({ error: 'Demo user was not found.' }, { status: 404 });
  }

  try {
    const result = await resetAndSeedDemoAccount(adminClient, demoUserId);

    await adminClient.auth.admin.updateUserById(demoUserId, {
      app_metadata: { is_demo: true, demo_reset_at: new Date().toISOString() },
    });

    return NextResponse.json({
      ok: true,
      demoUserId: result.demoUserId,
      arenaId: result.arenaId,
      inviteCode: result.inviteCode,
      resetAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Demo reset failed:', error);
    return NextResponse.json({ error: 'Demo reset failed.' }, { status: 500 });
  }
}