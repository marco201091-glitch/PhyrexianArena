-- Permanent match facts and immutable display snapshots allow bulky live-game
-- rows (and their idempotency journal) to be removed after a short recovery
-- window without changing historical reports.
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS starting_life integer;

ALTER TABLE public.matches
  DROP CONSTRAINT IF EXISTS matches_starting_life_positive,
  ADD CONSTRAINT matches_starting_life_positive CHECK (
    starting_life IS NULL OR starting_life BETWEEN 1 AND 999
  );

ALTER TABLE public.match_participants
  ADD COLUMN IF NOT EXISTS participant_name_snapshot text,
  ADD COLUMN IF NOT EXISTS deck_name_snapshot text,
  ADD COLUMN IF NOT EXISTS commander_snapshot text,
  ADD COLUMN IF NOT EXISTS commander_image_snapshot text,
  ADD COLUMN IF NOT EXISTS deck_bracket_snapshot text,
  ADD COLUMN IF NOT EXISTS color_identity_snapshot text[],
  ADD COLUMN IF NOT EXISTS final_life integer,
  ADD COLUMN IF NOT EXISTS final_infect integer;

ALTER TABLE public.match_participants
  DROP CONSTRAINT IF EXISTS match_participants_final_infect_nonnegative,
  ADD CONSTRAINT match_participants_final_infect_nonnegative CHECK (
    final_infect IS NULL OR final_infect >= 0
  );

CREATE OR REPLACE FUNCTION private.sync_match_live_metrics()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_metrics jsonb;
  v_win_condition text;
BEGIN
  IF NEW.match_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_metrics := NEW.state #> '{summary,byParticipant}';

  IF pg_catalog.jsonb_typeof(v_metrics) = 'object' THEN
    UPDATE public.match_participants AS participant
    SET
      tracked_event_count = private.live_metric_int(metric.value, 'eventCount'),
      life_lost = private.live_metric_int(metric.value, 'lifeLost'),
      life_gained = private.live_metric_int(metric.value, 'lifeGained'),
      life_damage_dealt = private.live_metric_int(metric.value, 'lifeDamageDealt'),
      unattributed_life_lost = private.live_metric_int(metric.value, 'unattributedLifeLost'),
      commander_damage_taken = private.live_metric_int(metric.value, 'commanderDamageTaken'),
      commander_damage_dealt = private.live_metric_int(metric.value, 'commanderDamageDealt'),
      infect_received = private.live_metric_int(metric.value, 'infectReceived'),
      infect_dealt = private.live_metric_int(metric.value, 'infectDealt'),
      eliminations = private.live_metric_int(metric.value, 'eliminations'),
      eliminations_caused = private.live_metric_int(metric.value, 'eliminationsCaused'),
      revives = private.live_metric_int(metric.value, 'revives'),
      corrections = private.live_metric_int(metric.value, 'corrections'),
      group_damage_dealt = private.live_metric_int(metric.value, 'groupDamageDealt'),
      group_damage_events = private.live_metric_int(metric.value, 'groupDamageEvents')
    FROM pg_catalog.jsonb_each(v_metrics) AS metric(key, value)
    WHERE participant.match_id = NEW.match_id
      AND (
        (pg_catalog.split_part(metric.key, ':', 1) = 'user'
          AND participant.user_id::text = pg_catalog.split_part(metric.key, ':', 2))
        OR
        (pg_catalog.split_part(metric.key, ':', 1) = 'guest'
          AND participant.guest_id::text = pg_catalog.split_part(metric.key, ':', 2))
      );
  END IF;

  SELECT match.win_condition INTO v_win_condition
  FROM public.matches AS match
  WHERE match.id = NEW.match_id;

  WITH state_players AS (
    SELECT
      player ->> 'participantKey' AS participant_key,
      NULLIF(player ->> 'displayName', '') AS display_name,
      NULLIF(player ->> 'commander', '') AS commander,
      NULLIF(player ->> 'commanderImage', '') AS commander_image,
      NULLIF(player ->> 'life', '')::integer AS final_life,
      GREATEST(0, COALESCE(NULLIF(player ->> 'infect', '')::integer, 0)) AS final_infect,
      NULLIF(player ->> 'eliminatedAt', '')::timestamptz AS eliminated_at
    FROM pg_catalog.jsonb_array_elements(NEW.state -> 'players') AS player
  ),
  snapshots AS (
    SELECT
      participant.id,
      state_player.participant_key,
      state_player.eliminated_at,
      state_player.final_life,
      state_player.final_infect,
      COALESCE(
        state_player.display_name,
        guest.display_name,
        NULLIF(profile.display_name, ''),
        profile.username,
        'Player'
      ) AS participant_name,
      COALESCE(deck.name, guest_deck.name, state_player.commander, 'Deck') AS deck_name,
      COALESCE(state_player.commander, deck.commander, guest_deck.commander, 'Unknown commander') AS commander,
      COALESCE(state_player.commander_image, deck.commander_image, guest_deck.commander_image) AS commander_image,
      COALESCE(deck.bracket, guest_deck.bracket) AS bracket,
      COALESCE(deck.color_identity, guest_deck.color_identity, '{}'::text[]) AS color_identity
    FROM public.match_participants AS participant
    JOIN state_players AS state_player
      ON state_player.participant_key = CASE
        WHEN participant.user_id IS NOT NULL THEN 'user:' || participant.user_id::text
        ELSE 'guest:' || participant.guest_id::text
      END
    LEFT JOIN public.profiles AS profile ON profile.id = participant.user_id
    LEFT JOIN public.arena_guests AS guest ON guest.id = participant.guest_id
    LEFT JOIN public.decks AS deck ON deck.id = participant.deck_id
    LEFT JOIN public.arena_guest_decks AS guest_deck ON guest_deck.id = participant.guest_deck_id
    WHERE participant.match_id = NEW.match_id
  )
  UPDATE public.match_participants AS participant
  SET
    participant_name_snapshot = snapshot.participant_name,
    deck_name_snapshot = snapshot.deck_name,
    commander_snapshot = snapshot.commander,
    commander_image_snapshot = snapshot.commander_image,
    deck_bracket_snapshot = snapshot.bracket,
    color_identity_snapshot = snapshot.color_identity,
    final_life = snapshot.final_life,
    final_infect = snapshot.final_infect,
    was_starting_player = COALESCE(
      snapshot.participant_key = (NEW.state ->> 'startingPlayerKey'),
      false
    ),
    eliminated_at = snapshot.eliminated_at,
    placement = CASE
      WHEN participant.is_winner THEN 1
      WHEN v_win_condition = 'last_standing' AND snapshot.eliminated_at IS NOT NULL THEN
        2 + (
          SELECT count(*)::smallint
          FROM snapshots AS later_snapshot
          WHERE later_snapshot.eliminated_at > snapshot.eliminated_at
        )
      ELSE NULL
    END
  FROM snapshots AS snapshot
  WHERE participant.id = snapshot.id;

  UPDATE public.matches
  SET
    -- Legacy v1 games can still depend on their raw log to reconstruct metrics.
    -- Mark a match as fully compact only when cumulative counters were present.
    tracking_version = CASE
      WHEN pg_catalog.jsonb_typeof(v_metrics) = 'object' THEN 3
      ELSE COALESCE(tracking_version, 1)
    END,
    starting_life = NEW.starting_life
  WHERE id = NEW.match_id;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.sync_match_live_metrics()
  FROM PUBLIC, anon, authenticated;

-- Remote guests are disabled. Removing the hooks avoids one lobby lookup for
-- every live-game write while leaving the dormant schema available to restore.
DROP TRIGGER IF EXISTS broadcast_guest_live_game_state_trigger ON public.live_games;
DROP TRIGGER IF EXISTS broadcast_public_counter_state_trigger ON public.public_counter_sessions;

-- Re-run the finalization trigger once so matches completed before this
-- migration also receive immutable snapshots before retention starts.
UPDATE public.live_games
SET match_id = match_id
WHERE match_id IS NOT NULL;

-- Match the active-game lookup and historical analytics filters with compact
-- indexes. The previous full live-game indexes also indexed terminal sessions.
DROP INDEX IF EXISTS public.idx_live_games_group_status;
DROP INDEX IF EXISTS public.idx_live_games_group_updated;

CREATE INDEX IF NOT EXISTS idx_live_games_active_group_updated
  ON public.live_games(group_id, updated_at DESC)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_live_games_match
  ON public.live_games(match_id)
  WHERE match_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_match_participants_user_match
  ON public.match_participants(user_id, match_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_match_participants_guest_match
  ON public.match_participants(guest_id, match_id)
  WHERE guest_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.get_arena_member_decks(
  p_group_id uuid,
  p_user_ids uuid[],
  p_limit_per_user integer DEFAULT 120
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  group_id uuid,
  name text,
  commander text,
  commander_image text,
  source_url text,
  source_type text,
  bracket text,
  color_identity text[],
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH ranked AS (
    SELECT
      deck.*,
      row_number() OVER (
        PARTITION BY deck.user_id
        ORDER BY deck.created_at DESC, deck.id
      ) AS position
    FROM public.decks AS deck
    JOIN public.group_members AS member
      ON member.group_id = p_group_id
     AND member.user_id = deck.user_id
    WHERE deck.user_id = ANY(COALESCE(p_user_ids, '{}'::uuid[]))
      AND (
        public.is_admin((SELECT auth.uid()))
        OR public.is_group_member(p_group_id, (SELECT auth.uid()))
      )
  )
  SELECT
    ranked.id,
    ranked.user_id,
    ranked.group_id,
    ranked.name,
    ranked.commander,
    ranked.commander_image,
    ranked.source_url,
    ranked.source_type,
    ranked.bracket,
    ranked.color_identity,
    ranked.created_at
  FROM ranked
  WHERE ranked.position <= LEAST(120, GREATEST(1, p_limit_per_user))
  ORDER BY ranked.user_id, ranked.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_arena_member_decks(uuid, uuid[], integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_arena_member_decks(uuid, uuid[], integer)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.get_arena_analytics_bundle(
  p_group_id uuid,
  p_since timestamptz DEFAULT NULL,
  p_until timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH facts AS MATERIALIZED (
    SELECT
      match.id AS match_id,
      match.played_at,
      match.duration_seconds,
      match.tracking_version,
      participant.user_id,
      participant.guest_id,
      participant.deck_id,
      participant.guest_deck_id,
      participant.is_winner,
      participant.placement,
      participant.life_lost,
      participant.life_gained,
      participant.life_damage_dealt,
      participant.commander_damage_dealt,
      participant.infect_dealt,
      participant.eliminations_caused,
      participant.group_damage_dealt,
      participant.group_damage_events,
      COALESCE(
        participant.participant_name_snapshot,
        guest.display_name,
        NULLIF(profile.display_name, ''),
        profile.username,
        'Player'
      ) AS participant_name,
      COALESCE(participant.deck_name_snapshot, deck.name, guest_deck.name, 'Deck') AS deck_name,
      COALESCE(participant.commander_snapshot, deck.commander, guest_deck.commander, 'Unknown commander') AS commander,
      COALESCE(participant.commander_image_snapshot, deck.commander_image, guest_deck.commander_image) AS commander_image,
      COALESCE(participant.deck_bracket_snapshot, deck.bracket, guest_deck.bracket) AS bracket,
      COALESCE(participant.color_identity_snapshot, deck.color_identity, guest_deck.color_identity, '{}'::text[]) AS color_identity
    FROM public.matches AS match
    JOIN public.match_participants AS participant ON participant.match_id = match.id
    LEFT JOIN public.profiles AS profile ON profile.id = participant.user_id
    LEFT JOIN public.arena_guests AS guest ON guest.id = participant.guest_id
    LEFT JOIN public.decks AS deck ON deck.id = participant.deck_id
    LEFT JOIN public.arena_guest_decks AS guest_deck ON guest_deck.id = participant.guest_deck_id
    WHERE match.group_id = p_group_id
      AND (p_since IS NULL OR match.played_at >= p_since)
      AND (p_until IS NULL OR match.played_at < p_until)
      AND (
        public.is_admin((SELECT auth.uid()))
        OR public.is_group_member(p_group_id, (SELECT auth.uid()))
      )
  ),
  player_rollup AS (
    SELECT
      CASE WHEN user_id IS NOT NULL THEN 'user:' || user_id::text ELSE 'guest:' || guest_id::text END AS key,
      user_id,
      guest_id,
      (array_agg(participant_name ORDER BY played_at DESC))[1] AS display_name,
      guest_id IS NOT NULL AS is_guest,
      count(*)::integer AS games_played,
      count(*) FILTER (WHERE is_winner)::integer AS wins
    FROM facts
    GROUP BY key, user_id, guest_id, guest_id IS NOT NULL
  ),
  commander_rollup AS (
    SELECT
      commander,
      commander_image,
      bracket,
      count(*)::integer AS games_played,
      count(*) FILTER (WHERE is_winner)::integer AS wins
    FROM facts
    GROUP BY commander, commander_image, bracket
  ),
  color_rollup AS (
    SELECT
      color_identity,
      bracket,
      count(*)::integer AS appearances,
      count(*) FILTER (WHERE is_winner)::integer AS wins
    FROM facts
    GROUP BY color_identity, bracket
  ),
  deck_rollup AS (
    SELECT
      CASE WHEN deck_id IS NOT NULL THEN 'deck:' || deck_id::text ELSE 'guest:' || guest_deck_id::text END AS key,
      COALESCE(deck_id, guest_deck_id) AS deck_id,
      guest_deck_id IS NOT NULL AS is_guest_deck,
      (array_agg(deck_name ORDER BY played_at DESC))[1] AS deck_name,
      (array_agg(commander ORDER BY played_at DESC))[1] AS commander,
      (array_agg(commander_image ORDER BY played_at DESC))[1] AS commander_image,
      count(*)::integer AS games_played,
      count(*) FILTER (
        WHERE tracking_version IS NOT NULL OR duration_seconds IS NOT NULL
      )::integer AS tracked_games,
      count(*) FILTER (WHERE is_winner)::integer AS wins,
      count(*) FILTER (WHERE placement = 2)::integer AS second_places,
      COALESCE(sum(life_damage_dealt) FILTER (
        WHERE tracking_version IS NOT NULL OR duration_seconds IS NOT NULL
      ), 0)::integer AS total_damage_dealt,
      COALESCE(sum(life_lost) FILTER (
        WHERE tracking_version IS NOT NULL OR duration_seconds IS NOT NULL
      ), 0)::integer AS total_damage_taken,
      COALESCE(sum(life_gained) FILTER (
        WHERE tracking_version IS NOT NULL OR duration_seconds IS NOT NULL
      ), 0)::integer AS total_life_gained,
      COALESCE(sum(commander_damage_dealt) FILTER (
        WHERE tracking_version IS NOT NULL OR duration_seconds IS NOT NULL
      ), 0)::integer AS commander_damage_dealt,
      COALESCE(sum(infect_dealt) FILTER (
        WHERE tracking_version IS NOT NULL OR duration_seconds IS NOT NULL
      ), 0)::integer AS infect_dealt,
      COALESCE(sum(eliminations_caused) FILTER (
        WHERE tracking_version IS NOT NULL OR duration_seconds IS NOT NULL
      ), 0)::integer AS eliminations,
      COALESCE(sum(group_damage_dealt) FILTER (
        WHERE tracking_version IS NOT NULL OR duration_seconds IS NOT NULL
      ), 0)::integer AS group_damage_dealt,
      COALESCE(sum(group_damage_events) FILTER (
        WHERE tracking_version IS NOT NULL OR duration_seconds IS NOT NULL
      ), 0)::integer AS group_damage_events,
      round(percentile_cont(0.5) WITHIN GROUP (ORDER BY duration_seconds)
        FILTER (WHERE is_winner AND duration_seconds IS NOT NULL))::integer
        AS median_winning_duration_seconds
    FROM facts
    WHERE deck_id IS NOT NULL OR guest_deck_id IS NOT NULL
    GROUP BY key, COALESCE(deck_id, guest_deck_id), guest_deck_id IS NOT NULL
  )
  SELECT pg_catalog.jsonb_build_object(
    'players', COALESCE((SELECT pg_catalog.jsonb_agg(player_rollup) FROM player_rollup), '[]'::jsonb),
    'commanders', COALESCE((SELECT pg_catalog.jsonb_agg(commander_rollup) FROM commander_rollup), '[]'::jsonb),
    'colors', COALESCE((SELECT pg_catalog.jsonb_agg(color_rollup) FROM color_rollup), '[]'::jsonb),
    'decks', COALESCE((SELECT pg_catalog.jsonb_agg(deck_rollup) FROM deck_rollup), '[]'::jsonb),
    'totalMatches', (SELECT count(DISTINCT match_id)::integer FROM facts)
  );
$$;

REVOKE ALL ON FUNCTION public.get_arena_analytics_bundle(uuid, timestamptz, timestamptz)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_arena_analytics_bundle(uuid, timestamptz, timestamptz)
  TO authenticated;

-- Dashboard facts are returned by one indexed join instead of downloading
-- participant ids, then matches, then decks through large client-side IN lists.
CREATE OR REPLACE FUNCTION public.get_personal_analytics_facts(
  p_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  is_winner boolean,
  deck_id uuid,
  played_at timestamptz,
  name text,
  commander text,
  commander_image text,
  color_identity text[],
  bracket text,
  source_type text,
  source_url text,
  owner_username text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    participant.is_winner,
    participant.deck_id,
    match.played_at,
    COALESCE(participant.deck_name_snapshot, deck.name, 'Deck'),
    COALESCE(participant.commander_snapshot, deck.commander, 'Unknown commander'),
    COALESCE(participant.commander_image_snapshot, deck.commander_image),
    COALESCE(participant.color_identity_snapshot, deck.color_identity, '{}'::text[]),
    COALESCE(participant.deck_bracket_snapshot, deck.bracket),
    deck.source_type,
    deck.source_url,
    profile.username
  FROM public.match_participants AS participant
  JOIN public.matches AS match ON match.id = participant.match_id
  LEFT JOIN public.decks AS deck ON deck.id = participant.deck_id
  LEFT JOIN public.profiles AS profile ON profile.id = participant.user_id
  WHERE participant.user_id = COALESCE(p_user_id, (SELECT auth.uid()))
    AND participant.deck_id IS NOT NULL
    AND (
      participant.user_id = (SELECT auth.uid())
      OR public.is_admin((SELECT auth.uid()))
    )
  ORDER BY match.played_at;
$$;

REVOKE ALL ON FUNCTION public.get_personal_analytics_facts(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_personal_analytics_facts(uuid)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.get_global_analytics_facts()
RETURNS TABLE (
  is_winner boolean,
  deck_id uuid,
  played_at timestamptz,
  name text,
  commander text,
  commander_image text,
  color_identity text[],
  bracket text,
  source_type text,
  source_url text,
  owner_username text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    participant.is_winner,
    participant.deck_id,
    match.played_at,
    COALESCE(participant.deck_name_snapshot, deck.name, 'Deck'),
    COALESCE(participant.commander_snapshot, deck.commander, 'Unknown commander'),
    COALESCE(participant.commander_image_snapshot, deck.commander_image),
    COALESCE(participant.color_identity_snapshot, deck.color_identity, '{}'::text[]),
    COALESCE(participant.deck_bracket_snapshot, deck.bracket),
    deck.source_type,
    deck.source_url,
    profile.username
  FROM public.match_participants AS participant
  JOIN public.matches AS match ON match.id = participant.match_id
  LEFT JOIN public.decks AS deck ON deck.id = participant.deck_id
  LEFT JOIN public.profiles AS profile ON profile.id = participant.user_id
  WHERE participant.user_id IS NOT NULL
    AND participant.deck_id IS NOT NULL
    AND participant.user_id NOT IN (
      SELECT excluded.excluded_user_id
      FROM public.get_analytics_excluded_user_ids() AS excluded(excluded_user_id)
    )
  ORDER BY match.played_at;
$$;

REVOKE ALL ON FUNCTION public.get_global_analytics_facts()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_global_analytics_facts()
  TO service_role;

CREATE OR REPLACE FUNCTION public.purge_finished_live_games(
  p_retention_days integer DEFAULT 14
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_deleted integer;
BEGIN
  IF p_retention_days IS NULL OR p_retention_days < 1 THEN
    RETURN 0;
  END IF;

  DELETE FROM public.live_game_mutations AS mutation
  USING public.live_games AS game
  WHERE game.id = mutation.live_game_id
    AND game.status IN ('ended', 'cancelled');

  DELETE FROM public.live_games
  WHERE status IN ('ended', 'cancelled')
    AND ended_at < now() - pg_catalog.make_interval(days => p_retention_days);

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_finished_live_games(integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_finished_live_games(integer)
  TO service_role;

COMMENT ON FUNCTION public.purge_finished_live_games(integer) IS
  'Drops terminal mutation journals immediately and deletes terminal live sessions after compact match snapshots are durable.';
