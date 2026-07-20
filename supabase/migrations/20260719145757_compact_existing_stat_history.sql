-- One-time cleanup for data produced before compact analytics.
--
-- Historical v1 matches may still need their raw log to reconstruct missing
-- participant aggregates, so they are deliberately excluded. Versions 2+ have
-- durable match_participants metrics and only need elimination/revive highlights.
WITH compacted_match_logs AS (
  SELECT
    match.id,
    COALESCE(
      (
        SELECT pg_catalog.jsonb_agg(retained.event_value ORDER BY retained.ordinality)
        FROM (
          SELECT event.event_value, event.ordinality
          FROM pg_catalog.jsonb_array_elements(match.live_game_log)
            WITH ORDINALITY AS event(event_value, ordinality)
          WHERE event.event_value ->> 'type' IN ('elimination', 'revive')
          ORDER BY event.ordinality DESC
          LIMIT 24
        ) AS retained
      ),
      '[]'::jsonb
    ) AS compact_log
  FROM public.matches AS match
  WHERE match.tracking_version >= 2
    AND pg_catalog.jsonb_typeof(match.live_game_log) = 'array'
    AND pg_catalog.jsonb_array_length(match.live_game_log) > 0
)
UPDATE public.matches AS match
SET live_game_log = compacted.compact_log
FROM compacted_match_logs AS compacted
WHERE match.id = compacted.id
  AND match.live_game_log IS DISTINCT FROM compacted.compact_log;

-- Keep terminal live-game payloads small during their short recovery window.
-- The permanent match row is authoritative once tracking_version >= 2.
WITH compacted_live_states AS (
  SELECT
    game.id,
    pg_catalog.jsonb_set(
      game.state,
      '{events}',
      COALESCE(
        (
          SELECT pg_catalog.jsonb_agg(retained.event_value ORDER BY retained.ordinality)
          FROM (
            SELECT event.event_value, event.ordinality
            FROM pg_catalog.jsonb_array_elements(game.state -> 'events')
              WITH ORDINALITY AS event(event_value, ordinality)
            WHERE event.event_value ->> 'type' IN ('elimination', 'revive')
            ORDER BY event.ordinality DESC
            LIMIT 24
          ) AS retained
        ),
        '[]'::jsonb
      ),
      true
    ) AS compact_state
  FROM public.live_games AS game
  JOIN public.matches AS match ON match.id = game.match_id
  WHERE game.status = 'ended'
    AND match.tracking_version >= 2
    AND pg_catalog.jsonb_typeof(game.state) = 'object'
    AND pg_catalog.jsonb_typeof(game.state -> 'events') = 'array'
    AND pg_catalog.jsonb_array_length(game.state -> 'events') > 0
)
UPDATE public.live_games AS game
SET state = compacted.compact_state
FROM compacted_live_states AS compacted
WHERE game.id = compacted.id
  AND game.state IS DISTINCT FROM compacted.compact_state;

-- Mutation ids only provide retry idempotency while a game is active. They do
-- not feed reports, recaps, awards or historical analytics.
DELETE FROM public.live_game_mutations AS mutation
USING public.live_games AS game
WHERE game.id = mutation.live_game_id
  AND game.status IN ('ended', 'cancelled');

-- Remote guest play is disabled in every client. Remove its ephemeral tokens
-- and state while retaining the dormant schema for a possible future redesign.
DELETE FROM public.live_game_lobbies;
DELETE FROM public.public_counter_sessions;

-- Apply the same bounded retention immediately to existing technical data.
SELECT public.purge_old_live_game_telemetry(14);
SELECT public.purge_old_access_logs(30);
SELECT public.purge_finished_live_games(14);

COMMENT ON COLUMN public.matches.live_game_log IS
  'Versions 2+ contain at most 24 elimination/revive highlights. Legacy v1 logs remain available until their aggregate metrics are migrated.';
