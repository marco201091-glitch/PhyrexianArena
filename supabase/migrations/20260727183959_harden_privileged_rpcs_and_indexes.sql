-- V6 hardening: privileges, RLS planner caching and foreign-key indexes.
-- Schema/config only: this migration never copies, inserts, updates or deletes
-- application data.

-- Foreign-key indexes used by joins, RLS checks and cascading operations.
CREATE INDEX IF NOT EXISTS idx_matches_created_by
  ON public.matches (created_by);
CREATE INDEX IF NOT EXISTS idx_groups_created_by
  ON public.groups (created_by);
CREATE INDEX IF NOT EXISTS idx_live_game_lobbies_group_id
  ON public.live_game_lobbies (group_id);
CREATE INDEX IF NOT EXISTS idx_live_game_lobbies_live_game_id
  ON public.live_game_lobbies (live_game_id);
CREATE INDEX IF NOT EXISTS idx_live_game_lobby_guests_guest_deck_id
  ON public.live_game_lobby_guests (guest_deck_id);
CREATE INDEX IF NOT EXISTS idx_live_game_telemetry_live_game_id
  ON public.live_game_telemetry (live_game_id);
CREATE INDEX IF NOT EXISTS idx_live_games_created_by
  ON public.live_games (created_by);
CREATE INDEX IF NOT EXISTS idx_matches_winner_guest_id
  ON public.matches (winner_guest_id);
CREATE INDEX IF NOT EXISTS idx_matches_winner_id
  ON public.matches (winner_id);

ALTER TABLE public.profiles
  VALIDATE CONSTRAINT profiles_archidekt_username_format;

-- Policies originally assigned to PUBLIC are authenticated-only in practice:
-- their predicates require auth.uid(). Restricting the role avoids exposing
-- SECURITY DEFINER helper RPCs to anon merely to evaluate those policies.
ALTER POLICY "arena_guest_decks_insert" ON public.arena_guest_decks TO authenticated;
ALTER POLICY "arena_guest_decks_select" ON public.arena_guest_decks TO authenticated;
ALTER POLICY "arena_guest_decks_update" ON public.arena_guest_decks TO authenticated;
ALTER POLICY "arena_guests_insert" ON public.arena_guests TO authenticated;
ALTER POLICY "arena_guests_select" ON public.arena_guests TO authenticated;
ALTER POLICY "arena_guests_update" ON public.arena_guests TO authenticated;
-- Some clean installs only contain the current snake_case policies. Preserve
-- upgrades from older databases without making a full migration replay fail.
DO $$
DECLARE
  legacy_policy text;
BEGIN
  FOREACH legacy_policy IN ARRAY ARRAY[
    'Users can join groups',
    'Users can leave groups',
    'Users can view group members'
  ]
  LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'group_members'
        AND policyname = legacy_policy
    ) THEN
      EXECUTE format(
        'ALTER POLICY %I ON public.group_members TO authenticated',
        legacy_policy
      );
    END IF;
  END LOOP;
END;
$$;
ALTER POLICY "live_games_delete_creator" ON public.live_games TO authenticated;
ALTER POLICY "live_games_insert_members" ON public.live_games TO authenticated;
ALTER POLICY "live_games_select_members" ON public.live_games TO authenticated;
ALTER POLICY "live_games_update_members" ON public.live_games TO authenticated;
ALTER POLICY "match_participants_select" ON public.match_participants TO authenticated;
ALTER POLICY "matches_select" ON public.matches TO authenticated;

-- Preserve intentional anonymous, read-only visibility for public arenas
-- without invoking privileged helper functions.
DROP POLICY IF EXISTS "arena_guest_decks_anon_public_select" ON public.arena_guest_decks;
CREATE POLICY "arena_guest_decks_anon_public_select"
  ON public.arena_guest_decks
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM public.groups AS public_group
      WHERE public_group.id = arena_guest_decks.group_id
        AND public_group.is_public = true
    )
  );

DROP POLICY IF EXISTS "arena_guests_anon_public_select" ON public.arena_guests;
CREATE POLICY "arena_guests_anon_public_select"
  ON public.arena_guests
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM public.groups AS public_group
      WHERE public_group.id = arena_guests.group_id
        AND public_group.is_public = true
    )
  );

DROP POLICY IF EXISTS "matches_anon_public_select" ON public.matches;
CREATE POLICY "matches_anon_public_select"
  ON public.matches
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM public.groups AS public_group
      WHERE public_group.id = matches.group_id
        AND public_group.is_public = true
    )
  );

DROP POLICY IF EXISTS "match_participants_anon_public_select" ON public.match_participants;
CREATE POLICY "match_participants_anon_public_select"
  ON public.match_participants
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM public.matches AS public_match
      JOIN public.groups AS public_group ON public_group.id = public_match.group_id
      WHERE public_match.id = match_participants.match_id
        AND public_group.is_public = true
    )
  );

-- Cache auth.uid() once per statement inside every public RLS policy. Existing
-- cached calls are protected with a placeholder to keep this migration idempotent.
DO $$
DECLARE
  policy_row record;
  using_expression text;
  check_expression text;
  alter_statement text;
BEGIN
  FOR policy_row IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        COALESCE(qual, '') LIKE '%auth.uid()%'
        OR COALESCE(with_check, '') LIKE '%auth.uid()%'
      )
  LOOP
    using_expression := replace(
      replace(
        replace(policy_row.qual, '(SELECT auth.uid())', '__cached_auth_uid__'),
        'auth.uid()',
        '(SELECT auth.uid())'
      ),
      '__cached_auth_uid__',
      '(SELECT auth.uid())'
    );
    check_expression := replace(
      replace(
        replace(policy_row.with_check, '(SELECT auth.uid())', '__cached_auth_uid__'),
        'auth.uid()',
        '(SELECT auth.uid())'
      ),
      '__cached_auth_uid__',
      '(SELECT auth.uid())'
    );

    alter_statement := format(
      'ALTER POLICY %I ON %I.%I',
      policy_row.policyname,
      policy_row.schemaname,
      policy_row.tablename
    );
    IF using_expression IS NOT NULL THEN
      alter_statement := alter_statement || format(' USING (%s)', using_expression);
    END IF;
    IF check_expression IS NOT NULL THEN
      alter_statement := alter_statement || format(' WITH CHECK (%s)', check_expression);
    END IF;
    EXECUTE alter_statement;
  END LOOP;
END;
$$;

-- SECURITY DEFINER functions default to no client access. Only the explicitly
-- listed application RPCs are restored to authenticated users.
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
    'get_global_analytics_facts',
    'get_group_by_invite_code',
    'get_personal_analytics_facts',
    'is_admin',
    'is_group_member',
    'is_group_owner',
    'list_access_logs_for_admin',
    'users_share_group'
  ];
  anonymous_rpc_names constant text[] := ARRAY[
    'get_group_by_invite_code'
  ];
BEGIN
  FOR function_row IN
    SELECT
      procedure.oid::regprocedure AS signature,
      procedure.proname
    FROM pg_proc AS procedure
    JOIN pg_namespace AS namespace ON namespace.oid = procedure.pronamespace
    WHERE namespace.nspname = 'public'
      AND procedure.prosecdef
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %s SET search_path = public, pg_temp',
      function_row.signature
    );
    EXECUTE format(
      'REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated',
      function_row.signature
    );
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %s TO service_role',
      function_row.signature
    );

    IF function_row.proname = ANY(authenticated_rpc_names) THEN
      EXECUTE format(
        'GRANT EXECUTE ON FUNCTION %s TO authenticated',
        function_row.signature
      );
    END IF;

    IF function_row.proname = ANY(anonymous_rpc_names) THEN
      EXECUTE format(
        'GRANT EXECUTE ON FUNCTION %s TO anon',
        function_row.signature
      );
    END IF;
  END LOOP;
END;
$$;
