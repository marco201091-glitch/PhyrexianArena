-- Crash-safe, idempotent mutations and atomic match finalization for live games.

CREATE TABLE public.live_game_mutations (
  id uuid PRIMARY KEY,
  live_game_id uuid NOT NULL REFERENCES public.live_games(id) ON DELETE CASCADE,
  applied_version integer NOT NULL CHECK (applied_version >= 1),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX live_game_mutations_game_created_idx
  ON public.live_game_mutations(live_game_id, created_at DESC);

ALTER TABLE public.live_game_mutations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.live_game_mutations FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.apply_live_game_mutation(
  p_live_game_id uuid,
  p_mutation_id uuid,
  p_expected_version integer,
  p_next_state jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game public.live_games%ROWTYPE;
  v_state_version integer;
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

  IF v_game.status <> 'active' THEN
    RAISE EXCEPTION 'Live game is not active' USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.live_game_mutations
    WHERE id = p_mutation_id AND live_game_id = p_live_game_id
  ) THEN
    RETURN jsonb_build_object('applied', true, 'duplicate', true, 'record', to_jsonb(v_game));
  END IF;

  v_state_version := COALESCE((v_game.state ->> 'version')::integer, 0);
  IF v_state_version <> p_expected_version THEN
    RETURN jsonb_build_object('applied', false, 'duplicate', false, 'record', to_jsonb(v_game));
  END IF;

  IF jsonb_typeof(p_next_state -> 'players') <> 'array'
     OR COALESCE((p_next_state ->> 'version')::integer, -1) <> p_expected_version + 1 THEN
    RAISE EXCEPTION 'Invalid next live game state' USING ERRCODE = '22023';
  END IF;

  UPDATE public.live_games
  SET state = p_next_state
  WHERE id = p_live_game_id
  RETURNING * INTO v_game;

  INSERT INTO public.live_game_mutations(id, live_game_id, applied_version)
  VALUES (p_mutation_id, p_live_game_id, p_expected_version + 1);

  RETURN jsonb_build_object('applied', true, 'duplicate', false, 'record', to_jsonb(v_game));
END;
$$;

REVOKE ALL ON FUNCTION public.apply_live_game_mutation(uuid, uuid, integer, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_live_game_mutation(uuid, uuid, integer, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.finalize_live_game(
  p_live_game_id uuid,
  p_winner_key text,
  p_is_draw boolean,
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

  INSERT INTO public.matches(group_id, created_by, is_draw, winner_id, winner_guest_id, played_at, notes)
  VALUES (
    v_game.group_id,
    auth.uid(),
    p_is_draw,
    CASE WHEN NOT p_is_draw AND v_winner_type = 'user' THEN v_winner_id END,
    CASE WHEN NOT p_is_draw AND v_winner_type = 'guest' THEN v_winner_id END,
    now(),
    NULL
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
  SET last_played_at = now()
  WHERE id IN (
    SELECT p.guest_id
    FROM jsonb_to_recordset(p_players) AS p(guest_id uuid, is_guest boolean)
    WHERE p.is_guest
  );

  UPDATE public.live_games
  SET status = 'ended', match_id = v_match_id, ended_at = now()
  WHERE id = p_live_game_id;

  RETURN v_match_id;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_live_game(uuid, text, boolean, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalize_live_game(uuid, text, boolean, jsonb) TO authenticated;
