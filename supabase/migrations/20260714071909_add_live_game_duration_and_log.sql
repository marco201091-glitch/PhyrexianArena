ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS duration_seconds integer,
  ADD COLUMN IF NOT EXISTS live_game_log jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.matches
  DROP CONSTRAINT IF EXISTS matches_duration_seconds_nonnegative,
  ADD CONSTRAINT matches_duration_seconds_nonnegative
    CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  DROP CONSTRAINT IF EXISTS matches_live_game_log_array,
  ADD CONSTRAINT matches_live_game_log_array
    CHECK (jsonb_typeof(live_game_log) = 'array');

COMMENT ON COLUMN public.matches.duration_seconds IS
  'Elapsed duration of a tracked live game, in seconds.';
COMMENT ON COLUMN public.matches.live_game_log IS
  'Ordered live-game events such as damage, commander damage, infect, lifegain and corrections.';

DROP FUNCTION IF EXISTS public.finalize_live_game(uuid, text, boolean, jsonb);

CREATE OR REPLACE FUNCTION public.finalize_live_game(
  p_live_game_id uuid,
  p_winner_key text,
  p_is_draw boolean,
  p_ended_at timestamptz,
  p_players jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game public.live_games%ROWTYPE;
  v_match_id uuid;
  v_winner_type text;
  v_winner_id uuid;
  v_started_at timestamptz;
  v_ended_at timestamptz;
  v_duration_seconds integer;
  v_live_game_log jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_game
  FROM public.live_games
  WHERE id = p_live_game_id
  FOR UPDATE;

  IF NOT FOUND OR NOT public.is_group_member(v_game.group_id, auth.uid()) THEN
    RAISE EXCEPTION 'Live game not found' USING ERRCODE = '42501';
  END IF;

  IF v_game.match_id IS NOT NULL THEN
    RETURN v_game.match_id;
  END IF;

  IF v_game.status <> 'active' OR jsonb_typeof(p_players) <> 'array'
     OR jsonb_array_length(p_players) < 2 THEN
    RAISE EXCEPTION 'Invalid live game finalization' USING ERRCODE = '23514';
  END IF;

  IF NOT p_is_draw THEN
    v_winner_type := split_part(COALESCE(p_winner_key, ''), ':', 1);
    BEGIN
      v_winner_id := NULLIF(split_part(COALESCE(p_winner_key, ''), ':', 2), '')::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      v_winner_id := NULL;
    END;
    IF v_winner_type NOT IN ('user', 'guest') OR v_winner_id IS NULL THEN
      RAISE EXCEPTION 'A valid winner is required' USING ERRCODE = '22023';
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(p_players) AS p(
      participant_key text, deck_id uuid, is_guest boolean, user_id uuid, guest_id uuid
    )
    WHERE (p.is_guest AND (
      p.guest_id IS NULL
      OR NOT EXISTS (SELECT 1 FROM public.arena_guests g WHERE g.id = p.guest_id AND g.group_id = v_game.group_id)
      OR NOT EXISTS (SELECT 1 FROM public.arena_guest_decks d WHERE d.id = p.deck_id AND d.guest_id = p.guest_id AND d.group_id = v_game.group_id)
    )) OR (NOT p.is_guest AND (
      p.user_id IS NULL
      OR NOT public.is_group_member(v_game.group_id, p.user_id)
      OR NOT EXISTS (SELECT 1 FROM public.decks d WHERE d.id = p.deck_id AND d.user_id = p.user_id)
    ))
  ) THEN
    RAISE EXCEPTION 'Invalid live game participants' USING ERRCODE = '22023';
  END IF;

  v_started_at := COALESCE(v_game.started_at, v_game.created_at);
  v_ended_at := GREATEST(v_started_at, LEAST(COALESCE(p_ended_at, now()), now() + interval '5 minutes'));
  v_duration_seconds := FLOOR(EXTRACT(EPOCH FROM (v_ended_at - v_started_at)))::integer;
  v_live_game_log := CASE
    WHEN jsonb_typeof(v_game.state->'events') = 'array' THEN v_game.state->'events'
    ELSE '[]'::jsonb
  END;

  INSERT INTO public.matches(
    group_id, created_by, is_draw, winner_id, winner_guest_id, played_at, notes,
    duration_seconds, live_game_log
  )
  VALUES (
    v_game.group_id,
    auth.uid(),
    p_is_draw,
    CASE WHEN NOT p_is_draw AND v_winner_type = 'user' THEN v_winner_id END,
    CASE WHEN NOT p_is_draw AND v_winner_type = 'guest' THEN v_winner_id END,
    v_ended_at,
    NULL,
    v_duration_seconds,
    v_live_game_log
  )
  RETURNING id INTO v_match_id;

  INSERT INTO public.match_participants(match_id, user_id, guest_id, deck_id, guest_deck_id, is_winner)
  SELECT
    v_match_id,
    CASE WHEN p.is_guest THEN NULL ELSE p.user_id END,
    CASE WHEN p.is_guest THEN p.guest_id ELSE NULL END,
    CASE WHEN p.is_guest THEN NULL ELSE p.deck_id END,
    CASE WHEN p.is_guest THEN p.deck_id ELSE NULL END,
    NOT p_is_draw AND p.participant_key = p_winner_key
  FROM jsonb_to_recordset(p_players) AS p(
    participant_key text, deck_id uuid, is_guest boolean, user_id uuid, guest_id uuid
  );

  UPDATE public.arena_guests
  SET last_played_at = v_ended_at
  WHERE id IN (
    SELECT p.guest_id
    FROM jsonb_to_recordset(p_players) AS p(guest_id uuid, is_guest boolean)
    WHERE p.is_guest
  );

  UPDATE public.live_games
  SET status = 'ended', match_id = v_match_id, ended_at = v_ended_at
  WHERE id = p_live_game_id;

  RETURN v_match_id;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_live_game(uuid, text, boolean, timestamptz, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalize_live_game(uuid, text, boolean, timestamptz, jsonb) TO authenticated;
