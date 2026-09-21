import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Normalise line endings: the working copy is CRLF on Windows and LF on CI,
// and several assertions below deliberately span lines.
const sql = readFileSync(
  'supabase/migrations/20260919120000_draw_neutral_win_rate.sql',
  'utf8',
).replace(/\r\n/g, '\n').toLowerCase();

describe('draw-neutral win-rate migration', () => {
  it('exposes the draw counter wherever a win rate is derived', () => {
    // Both bundles roll up per player, per commander, per colour and per deck.
    expect(sql).toContain('create or replace function public.get_arena_analytics_bundle_base');
    expect(sql).toContain('create or replace function public.get_public_arena_analytics_bundle');
    expect(sql.match(/filter \(where is_draw\)::integer as draws/g)?.length).toBeGreaterThanOrEqual(6);
    expect(sql).toContain('count(participant.id) filter (where match.is_draw)::integer as draws');
  });

  it('carries the draw flag through the fact queries', () => {
    expect(sql).toContain('match.is_draw,');
    expect(sql).toContain('participant.deck_id,\n    match.played_at,\n    match.is_draw,');
    expect(sql).toContain('win_condition');
  });

  it('rebuilds season archives snapshotted under the old denominator', () => {
    // The marker is what lets the rollover tell a current archive from a stale
    // one, so the rebuild is targeted and runs once.
    expect(sql).toContain("archive.summary ->> 'payloadversion' = v_payload_version");
    expect(sql).toContain('on conflict (group_id, season_start, season_end) do update');
  });

  it('keeps analytics RPC permissions narrow', () => {
    expect(sql).toContain('revoke all on function public.get_personal_analytics_facts(uuid)');
    expect(sql).toContain('grant execute on function public.get_personal_analytics_facts(uuid)\n  to authenticated');
    expect(sql).toContain('revoke all on function public.get_global_analytics_facts()');
    expect(sql).toContain('grant execute on function public.get_global_analytics_facts()\n  to service_role');
    expect(sql).toContain('revoke all on function public.get_public_arena_analytics_bundle(uuid, timestamptz, timestamptz)');
    expect(sql).toContain('from public, anon, authenticated');
    expect(sql).toContain('to service_role');
  });

  it('does not divide the rate in SQL, and never wipes archives to force the rebuild', () => {
    expect(sql).not.toContain('drop table');
    expect(sql).not.toContain('delete from public.matches');
    expect(sql).not.toContain('delete from public.match_participants');
    expect(sql).not.toContain('truncate');
    // The only archive delete is the inherited reset-month cleanup, and it must
    // stay guarded. The rebuild itself goes through the upsert, not a wipe.
    expect(sql).not.toMatch(/delete from public\.arena_season_archives\s*;/);
    expect(sql).toContain('and archive.reset_month <> p_reset_month');
    // The formula lives in exactly one place: expo/lib/win-rate.ts.
    expect(sql).not.toMatch(/round\([^)]*wins[^)]*\/[^)]*games_played/);
  });

  it('pins the search path on every security definer function', () => {
    const definers = sql.match(/security definer/g)?.length ?? 0;
    const pinned = sql.match(/set search_path = ''/g)?.length ?? 0;
    expect(definers).toBeGreaterThanOrEqual(5);
    expect(pinned).toBeGreaterThanOrEqual(definers);
  });
});
