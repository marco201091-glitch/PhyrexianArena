import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const cleanup = readFileSync(
  resolve('supabase/migrations/20260719145757_compact_existing_stat_history.sql'),
  'utf8',
);

describe('existing stat history cleanup', () => {
  it('compacts only history that already has durable aggregate metrics', () => {
    expect(cleanup).toMatch(/match\.tracking_version >= 2/);
    expect(cleanup).toContain("'elimination', 'revive'");
    expect(cleanup).toContain('LIMIT 24');
    expect(cleanup).toContain('match.live_game_log IS DISTINCT FROM compacted.compact_log');
  });

  it('keeps legacy v1 logs available instead of discarding recoverable stats', () => {
    expect(cleanup).not.toMatch(/DELETE FROM public\.matches/);
    expect(cleanup).toContain('Legacy v1 logs remain available');
  });

  it('removes only technical and disabled remote-session data', () => {
    expect(cleanup).toContain('DELETE FROM public.live_game_mutations');
    expect(cleanup).toContain('DELETE FROM public.live_game_lobbies');
    expect(cleanup).toContain('DELETE FROM public.public_counter_sessions');
    expect(cleanup).toContain('purge_old_live_game_telemetry(14)');
    expect(cleanup).toContain('purge_old_access_logs(30)');
    expect(cleanup).toContain('purge_finished_live_games(14)');
  });
});
