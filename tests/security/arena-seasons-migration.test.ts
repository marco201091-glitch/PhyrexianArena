import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  new URL('../../supabase/migrations/20260813113051_arena_seasons.sql', import.meta.url),
  'utf8',
).toLowerCase();

describe('Arena seasons migration', () => {
  it('is additive and preserves V8 match and personal history', () => {
    expect(migration).toContain('add column if not exists season_reset_month');
    expect(migration).toContain('default 1');
    expect(migration).not.toContain('delete from public.matches');
    expect(migration).not.toContain('update public.profiles');
    expect(migration).not.toContain('create or replace function public.get_arena_analytics_bundle');
  });

  it('protects snapshots and privileged functions explicitly', () => {
    expect(migration).toContain('alter table public.arena_season_archives enable row level security');
    expect(migration).toContain('revoke all on table public.arena_season_archives');
    expect(migration.match(/security definer/g)?.length).toBeGreaterThanOrEqual(3);
    expect(migration.match(/set search_path = ''/g)?.length).toBeGreaterThanOrEqual(4);
  });
});
