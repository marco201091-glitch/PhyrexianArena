-- Phyrexian Arena 4.0.1: compact realtime analytics for Awards, match details,
-- and personal deck performance. Raw events remain bounded in live_games.state;
-- all leaderboard reads use these integer snapshots instead of scanning JSON.

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS tracking_version smallint;

ALTER TABLE public.match_participants
  ADD COLUMN IF NOT EXISTS placement smallint,
  ADD COLUMN IF NOT EXISTS eliminated_at timestamptz,
  ADD COLUMN IF NOT EXISTS was_starting_player boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS group_damage_dealt integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS group_damage_events integer NOT NULL DEFAULT 0;

ALTER TABLE public.matches
  DROP CONSTRAINT IF EXISTS matches_tracking_version_positive,
  ADD CONSTRAINT matches_tracking_version_positive CHECK (
    tracking_version IS NULL OR tracking_version >= 1
  );

ALTER TABLE public.match_participants
  DROP CONSTRAINT IF EXISTS match_participants_tracking_details_valid,
  ADD CONSTRAINT match_participants_tracking_details_valid CHECK (
    (placement IS NULL OR placement BETWEEN 1 AND 6)
    AND group_damage_dealt >= 0
    AND group_damage_events >= 0
  );

UPDATE public.matches
SET tracking_version = 1
WHERE tracking_version IS NULL
  AND duration_seconds IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_matches_group_played_at
  ON public.matches(group_id, played_at DESC);
CREATE INDEX IF NOT EXISTS idx_match_participants_guest_deck
  ON public.match_participants(guest_deck_id)
  WHERE guest_deck_id IS NOT NULL;

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
  IF NEW.match_id IS NULL OR NEW.match_id IS NOT DISTINCT FROM OLD.match_id THEN
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
      NULLIF(player ->> 'eliminatedAt', '')::timestamptz AS eliminated_at
    FROM pg_catalog.jsonb_array_elements(NEW.state -> 'players') AS player
  )
  UPDATE public.match_participants AS participant
  SET
    was_starting_player = state_player.participant_key = (NEW.state ->> 'startingPlayerKey'),
    eliminated_at = state_player.eliminated_at,
    placement = CASE
      WHEN participant.is_winner THEN 1
      WHEN v_win_condition = 'last_standing' AND state_player.eliminated_at IS NOT NULL THEN
        2 + (
          SELECT count(*)::smallint
          FROM state_players AS later_player
          WHERE later_player.eliminated_at > state_player.eliminated_at
        )
      ELSE NULL
    END
  FROM state_players AS state_player
  WHERE participant.match_id = NEW.match_id
    AND state_player.participant_key = CASE
      WHEN participant.user_id IS NOT NULL THEN 'user:' || participant.user_id::text
      ELSE 'guest:' || participant.guest_id::text
    END;

  UPDATE public.matches
  SET tracking_version = 2
  WHERE id = NEW.match_id;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.sync_match_live_metrics() FROM PUBLIC, anon, authenticated;

DROP FUNCTION IF EXISTS public.get_arena_stats_participants(uuid, timestamptz);

CREATE FUNCTION public.get_arena_stats_participants(
  p_group_id uuid,
  p_since timestamptz DEFAULT NULL
)
RETURNS TABLE (
  match_id uuid,
  played_at timestamptz,
  is_draw boolean,
  duration_seconds integer,
  win_condition text,
  tracking_version smallint,
  user_id uuid,
  guest_id uuid,
  deck_id uuid,
  guest_deck_id uuid,
  is_winner boolean,
  placement smallint,
  was_starting_player boolean,
  tracked_event_count integer,
  life_lost integer,
  life_gained integer,
  life_damage_dealt integer,
  commander_damage_taken integer,
  commander_damage_dealt integer,
  infect_received integer,
  infect_dealt integer,
  eliminations_caused integer,
  group_damage_dealt integer,
  group_damage_events integer,
  username text,
  display_name text,
  guest_display_name text,
  deck_name text,
  deck_commander text,
  deck_commander_image text,
  deck_bracket text,
  deck_color_identity text[],
  guest_deck_name text,
  guest_deck_commander text,
  guest_deck_commander_image text,
  guest_deck_bracket text,
  guest_deck_color_identity text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    match.id,
    match.played_at,
    match.is_draw,
    match.duration_seconds,
    match.win_condition,
    match.tracking_version,
    participant.user_id,
    participant.guest_id,
    participant.deck_id,
    participant.guest_deck_id,
    participant.is_winner,
    participant.placement,
    participant.was_starting_player,
    participant.tracked_event_count,
    participant.life_lost,
    participant.life_gained,
    participant.life_damage_dealt,
    participant.commander_damage_taken,
    participant.commander_damage_dealt,
    participant.infect_received,
    participant.infect_dealt,
    participant.eliminations_caused,
    participant.group_damage_dealt,
    participant.group_damage_events,
    profile.username,
    profile.display_name,
    guest.display_name,
    deck.name,
    deck.commander,
    deck.commander_image,
    deck.bracket,
    deck.color_identity,
    guest_deck.name,
    guest_deck.commander,
    guest_deck.commander_image,
    guest_deck.bracket,
    guest_deck.color_identity
  FROM public.matches AS match
  JOIN public.match_participants AS participant ON participant.match_id = match.id
  LEFT JOIN public.profiles AS profile ON profile.id = participant.user_id
  LEFT JOIN public.arena_guests AS guest ON guest.id = participant.guest_id
  LEFT JOIN public.decks AS deck ON deck.id = participant.deck_id
  LEFT JOIN public.arena_guest_decks AS guest_deck ON guest_deck.id = participant.guest_deck_id
  WHERE match.group_id = p_group_id
    AND (p_since IS NULL OR match.played_at >= p_since)
    AND (
      public.is_admin((SELECT auth.uid()))
      OR public.is_group_member(p_group_id, (SELECT auth.uid()))
    )
  ORDER BY match.played_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_arena_stats_participants(uuid, timestamptz)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_arena_stats_participants(uuid, timestamptz)
  TO authenticated;

COMMENT ON COLUMN public.matches.tracking_version IS
  'Null for manually recorded matches; identifies the compact realtime analytics schema.';
COMMENT ON COLUMN public.match_participants.group_damage_dealt IS
  'Life damage dealt through an opponents/all-players action; already included in life_damage_dealt.';
