import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  new URL('../../supabase/migrations/20260813113051_arena_seasons.sql', import.meta.url),
  'utf8',
).toLowerCase();
const optionalMigration = readFileSync(
  new URL('../../supabase/migrations/20260814074908_optional_arena_seasons.sql', import.meta.url),
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

  it('adds an enabled-by-default flag and a manager-only atomic settings RPC', () => {
    expect(optionalMigration).toContain('add column if not exists seasons_enabled boolean not null default true');
    expect(optionalMigration).toContain('create or replace function public.set_arena_season_settings');
    expect(optionalMigration).toContain("raise exception 'arena manager access required'");
    expect(optionalMigration).toContain('v_created_by = (select auth.uid())');
    expect(optionalMigration).toContain('grant execute on function public.set_arena_season_settings');
    expect(optionalMigration).not.toContain('delete from public.matches');
  });

  it('aggregates public all-time statistics in PostgreSQL without exposing the RPC', () => {
    expect(optionalMigration).toContain('create or replace function public.get_public_arena_analytics_bundle');
    expect(optionalMigration).toContain('with facts as materialized');
    expect(optionalMigration).toContain('grant execute on function public.get_public_arena_analytics_bundle');
    expect(optionalMigration).toMatch(
      /revoke all on function public\.get_public_arena_analytics_bundle[\s\S]+from public, anon, authenticated/,
    );
    expect(optionalMigration).toContain('to service_role');
    expect(optionalMigration).not.toContain('delete from public.match_participants');
  });
});
