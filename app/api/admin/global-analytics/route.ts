import { NextResponse } from 'next/server';
import { fetchGlobalAnalyticsForAdmin } from '@/lib/global-analytics-query';
import { isPlatformAdministrator } from '@/lib/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user || !(await isPlatformAdministrator(supabase, user))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const analytics = await fetchGlobalAnalyticsForAdmin();
    return NextResponse.json({ analytics });
  } catch (queryError) {
    console.error('Failed to fetch global analytics:', queryError);
    return NextResponse.json({ error: 'Failed to load global analytics.' }, { status: 500 });
  }
}