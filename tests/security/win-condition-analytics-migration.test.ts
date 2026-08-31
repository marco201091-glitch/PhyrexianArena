import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync('supabase/migrations/20260829205816_add_win_condition_analytics.sql', 'utf8').toLowerCase();

describe('win-condition analytics migration', () => {
  it('keeps analytics RPC permissions narrow while adding the nullable fact', () => {
    expect(sql).toContain('match.win_condition');
    expect(sql).toContain('revoke all on function public.get_personal_analytics_facts(uuid) from public, anon');
    expect(sql).toContain('grant execute on function public.get_personal_analytics_facts(uuid) to authenticated');
    expect(sql).toContain('revoke all on function public.get_global_analytics_facts() from public, anon, authenticated');
    expect(sql).toContain('grant execute on function public.get_global_analytics_facts() to service_role');
  });
});
