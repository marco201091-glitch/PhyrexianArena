import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve('supabase/migrations/20260729144659_v7_scalable_history_and_retention.sql'),
  'utf8',
);

describe('v7 scalable history migration', () => {
  it('keeps permanent match facts unlimited and only purges operational state', () => {
    expect(migration).not.toMatch(/DELETE FROM public\.matches/);
    expect(migration).not.toMatch(/DELETE FROM public\.match_participants/);
    expect(migration).toContain('public.purge_finished_live_games(14)');
    expect(migration).toContain('public.purge_old_live_game_telemetry(14)');
    expect(migration).toContain('public.purge_old_access_logs(30)');
  });

  it('bounds retained highlights and schedules maintenance', () => {
    expect(migration).toContain("IN ('elimination', 'revive')");
    expect(migration).toContain('LIMIT 24');
    expect(migration).toContain("'v7-bounded-storage-maintenance'");
  });

  it('supports stable newest-first history pagination', () => {
    expect(migration).toMatch(
      /idx_matches_group_played_id[\s\S]+group_id, played_at DESC, id DESC/,
    );
  });
});
