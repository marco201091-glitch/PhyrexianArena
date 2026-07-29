import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve('supabase/migrations/20260729160414_v7_release_hardening.sql'),
  'utf8',
);
const rollback = readFileSync(
  resolve('scripts/release/v7-release-hardening-rollback.sql'),
  'utf8',
);

describe('v7 release hardening', () => {
  it('derives mastery from permanent facts without mutable score state', () => {
    expect(migration).toContain('get_profile_deck_performance');
    expect(migration).toMatch(
      /count\(participant\.id\)\s*\+\s*2 \* count\(participant\.id\) FILTER \(WHERE participant\.is_winner\)/,
    );
    expect(migration).not.toMatch(/ADD COLUMN[^;]*mastery/i);
  });

  it('allows avatar upsert metadata without public bucket listing', () => {
    expect(migration).toContain('storage.allow_any_operation');
    expect(migration).toContain('object.get_authenticated_info');
    expect(migration).toContain('avatar_revision');
  });

  it('ships a rollback that never touches permanent match facts', () => {
    expect(rollback).not.toMatch(/DELETE FROM public\.(matches|match_participants)/);
    expect(rollback).toContain('DROP FUNCTION IF EXISTS public.get_profile_deck_performance');
  });
});
