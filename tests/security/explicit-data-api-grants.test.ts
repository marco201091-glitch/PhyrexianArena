import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260812121901_explicit_data_api_grants.sql'),
  'utf8',
).toLowerCase();

describe('explicit Data API grants migration', () => {
  it('preserves current client access and secures future defaults', () => {
    expect(migration).toContain('to anon;');
    expect(migration).toContain('to authenticated;');
    expect(migration).toContain('to service_role;');
    expect(migration).toContain("rolname in ('postgres', 'supabase_admin')");
    expect(migration).toContain('alter default privileges for role %i in schema public revoke all on tables');
    expect(migration).toContain("to_regclass('public.push_tokens') is not null");
    expect(migration).toContain('begin;');
    expect(migration).toContain('commit;');
    expect(migration).not.toContain('revoke all on table public.');
    expect(migration).not.toContain('revoke all on all tables in schema public');
  });
});
