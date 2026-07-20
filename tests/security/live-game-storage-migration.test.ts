import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve('supabase/migrations/20260719143831_optimize_live_game_storage_and_queries.sql'),
  'utf8',
);

describe('live-game storage optimization migration', () => {
  it('persists historical snapshots before temporary rows can be removed', () => {
    expect(migration).toContain('participant_name_snapshot');
    expect(migration).toContain('commander_image_snapshot');
    expect(migration).toContain('final_life');
    expect(migration).toMatch(/was_starting_player\s*=\s*COALESCE\(/);
    expect(migration).toMatch(/jsonb_typeof\(v_metrics\) = 'object' THEN 3/);
    expect(migration).toMatch(/UPDATE public\.live_games\s+SET match_id = match_id/);
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.purge_finished_live_games');
    expect(migration).toContain("status IN ('ended', 'cancelled')");
    expect(migration).toMatch(/DELETE FROM public\.live_game_mutations[\s\S]+status IN \('ended', 'cancelled'\)/);
  });

  it('uses partial indexes for active and participant-scoped lookups', () => {
    expect(migration).toMatch(/idx_live_games_active_group_updated[\s\S]+WHERE status = 'active'/);
    expect(migration).toMatch(/idx_match_participants_user_match[\s\S]+WHERE user_id IS NOT NULL/);
    expect(migration).toMatch(/idx_match_participants_guest_match[\s\S]+WHERE guest_id IS NOT NULL/);
  });

  it('removes disabled remote-guest write hooks and replaces N+1 analytics reads', () => {
    expect(migration).toContain('DROP TRIGGER IF EXISTS broadcast_guest_live_game_state_trigger');
    expect(migration).toContain('DROP TRIGGER IF EXISTS broadcast_public_counter_state_trigger');
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.get_arena_analytics_bundle');
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.get_arena_member_decks');
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.get_personal_analytics_facts');
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.get_global_analytics_facts');
  });
});
