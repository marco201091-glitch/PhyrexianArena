import { NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/app/api/_lib/auth';
import { applyUserRateLimit } from '@/app/api/_lib/with-rate-limit';
import { normalizeAccessLogSource, shouldSkipAccessLog } from '@/lib/access-log';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

async function resolveAuthenticatedUser(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (!error && user) {
    return user;
  }

  return requireAuthenticatedUser(request);
}

export async function POST(request: Request) {
  const user = await resolveAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json({ recorded: false, reason: 'unauthorized' }, { status: 401 });
  }

  if (shouldSkipAccessLog(user)) {
    return NextResponse.json({ recorded: false, reason: 'excluded' });
  }

  const rateLimited = await applyUserRateLimit(user, 'accessLog');
  if (rateLimited) return rateLimited;

  let source = 'web';
  try {
    const body = await request.json();
    source = normalizeAccessLogSource(body?.source);
  } catch {
    // Empty body defaults to web (browser clients).
  }

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: 'Access logging is not configured.' }, { status: 500 });
  }

  const { data, error: rpcError } = await adminClient.rpc('record_user_access', {
    p_user_id: user.id,
    p_source: source,
  });

  if (rpcError) {
    console.error('Access log RPC failed:', rpcError.message);
    return NextResponse.json({ error: 'Failed to record access.' }, { status: 500 });
  }

  const payload = data && typeof data === 'object'
    ? data as Record<string, unknown>
    : { recorded: false };

  return NextResponse.json(payload);
}