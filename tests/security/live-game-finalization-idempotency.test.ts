import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260714135348_add_live_game_win_condition.sql',
  'utf8',
);
const functionBody = migration.slice(migration.indexOf('CREATE FUNCTION public.finalize_live_game'));

describe('live-game finalization idempotency contract', () => {
  it('serializes concurrent finalizations and returns the existing match before inserting', () => {
    const lock = functionBody.indexOf('FOR UPDATE;');
    const existingResult = functionBody.indexOf('IF v_game.match_id IS NOT NULL THEN');
    const matchInsert = functionBody.indexOf('INSERT INTO public.matches(');

    expect(lock).toBeGreaterThan(0);
    expect(existingResult).toBeGreaterThan(lock);
    expect(matchInsert).toBeGreaterThan(existingResult);
    expect(functionBody.slice(existingResult, matchInsert)).toContain('RETURN v_game.match_id;');
  });

  it('keeps match-completed notifications deduplicated by match id', () => {
    const route = readFileSync('app/api/notifications/match-completed/route.ts', 'utf8');
    expect(route).toContain('dedupeKey: `match_completed:${match.id}`');
  });
});
