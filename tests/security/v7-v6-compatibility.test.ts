import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const V7_MIGRATIONS = [
  '20260728130411_v7_remove_remote_guest_sessions.sql',
  '20260728132414_v7_optimize_profile_deck_loading.sql',
  '20260729070641_v7_favorite_decks_first_in_arena_pickers.sql',
  '20260729080333_v7_arena_catalog_broadcast.sql',
  '20260729085256_v7_final_index_cleanup.sql',
  '20260729091210_v7_remove_guest_claim_links.sql',
];

function migration(name: string) {
  return fs.readFileSync(path.join(process.cwd(), 'supabase', 'migrations', name), 'utf8').toLowerCase();
}

describe('v7 database compatibility with v6 clients and data', () => {
  it('never drops or renames core v6 entities', () => {
    const sql = V7_MIGRATIONS.map(migration).join('\n');
    for (const entity of [
      'profiles',
      'groups',
      'group_members',
      'decks',
      'matches',
      'match_participants',
      'live_games',
      'arena_guests',
      'arena_guest_decks',
    ]) {
      expect(sql).not.toMatch(new RegExp(`drop\\s+table(?:\\s+if\\s+exists)?\\s+(?:public\\.)?${entity}\\b`));
      expect(sql).not.toMatch(new RegExp(`alter\\s+table\\s+(?:public\\.)?${entity}\\s+rename\\b`));
    }
  });

  it('limits destructive cleanup to the explicitly retired remote-guest subsystem', () => {
    const sql = migration(V7_MIGRATIONS[0]);
    const droppedTables = Array.from(sql.matchAll(/drop\s+table\s+if\s+exists\s+(?:public\.)?([a-z0-9_]+)/g))
      .map((match) => match[1]);
    expect(droppedTables).toEqual(expect.arrayContaining([
      'live_game_lobby_guests',
      'live_game_lobbies',
      'public_counter_guests',
      'public_counter_sessions',
    ]));
    expect(new Set(droppedTables)).toEqual(new Set([
      'live_game_lobby_guests',
      'live_game_lobbies',
      'public_counter_guests',
      'public_counter_sessions',
    ]));
  });

  it('retires guest claim links without touching local Arena guests or decks', () => {
    const sql = migration('20260729091210_v7_remove_guest_claim_links.sql');
    expect(sql).toContain('drop function if exists public.claim_arena_guest(text)');
    expect(sql).toContain('drop table if exists public.arena_guest_claim_links');
    expect(sql).not.toMatch(/drop\s+table.*arena_guests\b/);
    expect(sql).not.toMatch(/drop\s+table.*arena_guest_decks\b/);
  });
});
