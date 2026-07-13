import { NextResponse } from 'next/server';
import { applyUserRateLimit } from '@/app/api/_lib/with-rate-limit';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST() {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateLimited = await applyUserRateLimit(user, 'profileDeckRefresh');
  if (rateLimited) return rateLimited;

  return NextResponse.json({ ok: true });
}