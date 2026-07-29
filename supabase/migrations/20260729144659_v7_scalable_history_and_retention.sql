-- V7 scalable history and bounded operational storage.
--
-- Permanent match facts remain unlimited. Only short-lived live-game state,
-- retry journals and diagnostics are retained for recovery/debugging.

-- Keep every live payload bounded, including old cancelled sessions that were
-- never associated with a finalized match.
WITH compacted_states AS (
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
            ORDER BY ordinality DESC
            LIMIT 24
          ) AS retained
        ),
        '[]'::jsonb
      ),
      true
    ) AS compact_state
  FROM public.live_games AS game
  WHERE pg_catalog.jsonb_typeof(game.state) = 'object'
    AND pg_catalog.jsonb_typeof(game.state -> 'events') = 'array'
    AND (
      pg_catalog.jsonb_array_length(game.state -> 'events') > 24
      OR EXISTS (
        SELECT 1
        FROM pg_catalog.jsonb_array_elements(game.state -> 'events') AS event(value)
        WHERE event.value ->> 'type' NOT IN ('elimination', 'revive')
      )
    )
)
UPDATE public.live_games AS game
SET state = compacted.compact_state
FROM compacted_states AS compacted
WHERE game.id = compacted.id
  AND game.state IS DISTINCT FROM compacted.compact_state;

-- Terminal mutation journals are never used by reports and only support
-- retries while a game is active.
DELETE FROM public.live_game_mutations AS mutation
USING public.live_games AS game
WHERE game.id = mutation.live_game_id
  AND game.status IN ('ended', 'cancelled');

-- Apply retention now. Final match facts and participant aggregates are kept.
SELECT public.purge_finished_live_games(14);
SELECT public.purge_old_live_game_telemetry(14);
SELECT public.purge_old_access_logs(30);

-- Keyset history pagination and all-time analytics both use this covering
-- access path. The primary match row remains the source of truth.
CREATE INDEX IF NOT EXISTS idx_matches_group_played_id
  ON public.matches(group_id, played_at DESC, id DESC);

-- Superseded V1 policies duplicate the stricter current policies and make
-- Postgres evaluate two permissive expressions per operation.
DROP POLICY IF EXISTS "Users can view group members" ON public.group_members;
DROP POLICY IF EXISTS "Users can join groups" ON public.group_members;
DROP POLICY IF EXISTS "Users can leave groups" ON public.group_members;

-- Trigger helpers from the original schema predate explicit search paths.
-- Keep public resolution deterministic without changing their behavior.
ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_temp;
ALTER FUNCTION public.is_demo_user() SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_group() SET search_path = public, pg_temp;
ALTER FUNCTION public.touch_live_game_updated_at() SET search_path = public, pg_temp;

-- Cache auth.uid() once per statement in every public policy. This is
-- idempotent and also fixes policies added after the previous hardening pass.
DO $$
DECLARE
  policy_row record;
  using_expression text;
  check_expression text;
  alter_statement text;
BEGIN
  FOR policy_row IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND (
        COALESCE(qual, '') ~* 'auth\.uid\(\)'
        OR COALESCE(with_check, '') ~* 'auth\.uid\(\)'
      )
  LOOP
    using_expression := pg_catalog.regexp_replace(
      policy_row.qual,
      '\(\s*select\s+auth\.uid\(\)\s*\)',
      '__cached_auth_uid__',
      'gi'
    );
    using_expression := pg_catalog.replace(
      using_expression,
      'auth.uid()',
      '(SELECT auth.uid())'
    );
    using_expression := pg_catalog.replace(
      using_expression,
      '__cached_auth_uid__',
      '(SELECT auth.uid())'
    );

    check_expression := pg_catalog.regexp_replace(
      policy_row.with_check,
      '\(\s*select\s+auth\.uid\(\)\s*\)',
      '__cached_auth_uid__',
      'gi'
    );
    check_expression := pg_catalog.replace(
      check_expression,
      'auth.uid()',
      '(SELECT auth.uid())'
    );
    check_expression := pg_catalog.replace(
      check_expression,
      '__cached_auth_uid__',
      '(SELECT auth.uid())'
    );

    alter_statement := pg_catalog.format(
      'ALTER POLICY %I ON %I.%I',
      policy_row.policyname,
      policy_row.schemaname,
      policy_row.tablename
    );
    IF using_expression IS NOT NULL THEN
      alter_statement := alter_statement || pg_catalog.format(' USING (%s)', using_expression);
    END IF;
    IF check_expression IS NOT NULL THEN
      alter_statement := alter_statement || pg_catalog.format(' WITH CHECK (%s)', check_expression);
    END IF;
    EXECUTE alter_statement;
  END LOOP;
END;
$$;

-- Trigger-only and maintenance functions must never be callable through the
-- Data API. Restore only the RPC surface intentionally used by clients.
DO $$
DECLARE
  function_row record;
  authenticated_rpc_names constant text[] := ARRAY[
    'apply_live_game_mutation',
    'apply_live_game_mutation_batch',
    'finalize_live_game',
    'get_arena_analytics_bundle',
    'get_arena_match_day_summaries',
    'get_arena_matches_for_day',
    'get_arena_member_decks',
    'get_arena_stats_participants',
    'get_group_by_invite_code',
    'get_personal_analytics_facts',
    'is_admin',
    'is_group_member',
    'is_group_owner',
    'list_access_logs_for_admin',
    'sync_archidekt_decks',
    'users_share_group'
  ];
BEGIN
  FOR function_row IN
    SELECT
      procedure.oid::pg_catalog.regprocedure AS signature,
      procedure.proname
    FROM pg_catalog.pg_proc AS procedure
    JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = procedure.pronamespace
    WHERE namespace.nspname = 'public'
      AND procedure.prosecdef
  LOOP
    EXECUTE pg_catalog.format(
      'REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated',
      function_row.signature
    );
    EXECUTE pg_catalog.format(
      'GRANT EXECUTE ON FUNCTION %s TO service_role',
      function_row.signature
    );

    IF function_row.proname = ANY(authenticated_rpc_names) THEN
      EXECUTE pg_catalog.format(
        'GRANT EXECUTE ON FUNCTION %s TO authenticated',
        function_row.signature
      );
    END IF;

    IF function_row.proname = 'get_group_by_invite_code' THEN
      EXECUTE pg_catalog.format(
        'GRANT EXECUTE ON FUNCTION %s TO anon',
        function_row.signature
      );
    END IF;
  END LOOP;
END;
$$;

-- Supabase Cron runs maintenance even when the Dev Vercel deployment sleeps.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

DO $$
DECLARE
  existing_job_id bigint;
BEGIN
  SELECT jobid
  INTO existing_job_id
  FROM cron.job
  WHERE jobname = 'v7-bounded-storage-maintenance'
  LIMIT 1;

  IF existing_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(existing_job_id);
  END IF;

  PERFORM cron.schedule(
    'v7-bounded-storage-maintenance',
    '17 4 * * *',
    $maintenance$
      SELECT public.purge_finished_live_games(14);
      SELECT public.purge_old_live_game_telemetry(14);
      SELECT public.purge_old_access_logs(30);
    $maintenance$
  );
END;
$$;
