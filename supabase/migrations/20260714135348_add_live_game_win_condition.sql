ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS win_condition text;

ALTER TABLE public.matches
  DROP CONSTRAINT IF EXISTS matches_win_condition_valid,
  ADD CONSTRAINT matches_win_condition_valid CHECK (
    win_condition IS NULL OR win_condition IN (
      'last_standing', 'combo', 'concession', 'alternate_card', 'other'
    )
  );

COMMENT ON COLUMN public.matches.win_condition IS
  'How a tracked game ended: last standing, combo, concession, alternate card win, or other.';

-- Validate the initial pod as well as direct table updates. The existing trigger
-- calls this function after inserts/updates, so any raised exception rolls back
-- the whole client operation.
CREATE OR REPLACE FUNCTION private.sync_live_game_participants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_old_keys jsonb;
  v_new_keys jsonb;
  v_player_count integer;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.group_id IS DISTINCT FROM NEW.group_id
       OR OLD.created_by IS DISTINCT FROM NEW.created_by THEN
      RAISE EXCEPTION 'Live game ownership cannot be changed' USING ERRCODE = '22023';
    END IF;

    v_old_keys := pg_catalog.jsonb_path_query_array(OLD.state, '$.players[*].participantKey');
    v_new_keys := pg_catalog.jsonb_path_query_array(NEW.state, '$.players[*].participantKey');
    IF OLD.status = 'active' AND NEW.status = 'active' AND v_old_keys <> v_new_keys THEN
      RAISE EXCEPTION 'An active live game pod cannot be changed' USING ERRCODE = '22023';
    END IF;
  ELSE
    v_new_keys := pg_catalog.jsonb_path_query_array(NEW.state, '$.players[*].participantKey');
  END IF;

  IF NEW.status = 'active' THEN
    IF pg_catalog.jsonb_typeof(NEW.state -> 'players') <> 'array'
       OR pg_catalog.jsonb_typeof(COALESCE(NEW.state -> 'events', '[]'::jsonb)) <> 'array'
       OR pg_catalog.pg_column_size(NEW.state) > 1048576 THEN
      RAISE EXCEPTION 'Invalid live game state' USING ERRCODE = '22023';
    END IF;

    v_player_count := pg_catalog.jsonb_array_length(NEW.state -> 'players');
    IF v_player_count < 2 OR v_player_count > 6
       OR pg_catalog.jsonb_array_length(COALESCE(NEW.state -> 'events', '[]'::jsonb)) > 500
       OR pg_catalog.jsonb_array_length(v_new_keys) <> v_player_count
       OR (
         SELECT count(*) <> count(DISTINCT player."participantKey")
         FROM pg_catalog.jsonb_to_recordset(NEW.state -> 'players') AS player("participantKey" text)
       ) THEN
      RAISE EXCEPTION 'Invalid live game pod' USING ERRCODE = '22023';
    END IF;

    IF EXISTS (
      WITH submitted AS (
        SELECT
          player."participantKey" AS participant_key,
          CASE
            WHEN player."participantKey" ~ '^(user|guest):[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
            THEN pg_catalog.split_part(player."participantKey", ':', 2)::uuid
          END AS participant_id,
          CASE
            WHEN player."deckId" ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
            THEN player."deckId"::uuid
          END AS deck_id,
          pg_catalog.split_part(player."participantKey", ':', 1) AS participant_type
        FROM pg_catalog.jsonb_to_recordset(NEW.state -> 'players') AS player(
          "participantKey" text, "deckId" text
        )
      )
      SELECT 1
      FROM submitted
      WHERE participant_id IS NULL OR deck_id IS NULL
         OR (participant_type = 'user' AND (
           NOT public.is_group_member(NEW.group_id, participant_id)
           OR NOT EXISTS (
             SELECT 1 FROM public.decks deck
             WHERE deck.id = submitted.deck_id AND deck.user_id = submitted.participant_id
           )
         ))
         OR (participant_type = 'guest' AND (
           NOT EXISTS (
             SELECT 1 FROM public.arena_guests guest
             WHERE guest.id = submitted.participant_id AND guest.group_id = NEW.group_id
           )
           OR NOT EXISTS (
             SELECT 1 FROM public.arena_guest_decks deck
             WHERE deck.id = submitted.deck_id
               AND deck.guest_id = submitted.participant_id
               AND deck.group_id = NEW.group_id
           )
         ))
    ) THEN
      RAISE EXCEPTION 'Invalid live game participant or deck' USING ERRCODE = '22023';
    END IF;
  END IF;

  DELETE FROM public.live_game_participants
  WHERE live_game_id = NEW.id;

  IF NEW.status = 'active' THEN
    INSERT INTO public.live_game_participants(live_game_id, group_id, participant_key)
    SELECT NEW.id, NEW.group_id, player ->> 'participantKey'
    FROM pg_catalog.jsonb_array_elements(NEW.state -> 'players') AS player;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.sync_live_game_participants() FROM PUBLIC, anon, authenticated;

-- Keep the optimistic realtime RPC idempotent while preventing a client from
-- replacing the pod, decks, or event log with an unbounded payload.
CREATE OR REPLACE FUNCTION public.apply_live_game_mutation(
  p_live_game_id uuid,
  p_mutation_id uuid,
  p_expected_version integer,
  p_next_state jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_game public.live_games%ROWTYPE;
  v_state_version integer;
  v_player_count integer;
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

  IF jsonb_typeof(p_next_state) <> 'object'
     OR jsonb_typeof(p_next_state -> 'players') <> 'array'
     OR jsonb_typeof(p_next_state -> 'events') <> 'array'
     OR COALESCE((p_next_state ->> 'version')::integer, -1) <> p_expected_version + 1
     OR pg_column_size(p_next_state) > 1048576 THEN
    RAISE EXCEPTION 'Invalid next live game state' USING ERRCODE = '22023';
  END IF;

  v_player_count := jsonb_array_length(p_next_state -> 'players');
  IF v_player_count < 2 OR v_player_count > 6
     OR jsonb_array_length(p_next_state -> 'events') > 500
     OR v_player_count <> jsonb_array_length(v_game.state -> 'players') THEN
    RAISE EXCEPTION 'Invalid live game state size' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(v_game.state -> 'players') AS previous_player(
      "participantKey" text, "deckId" uuid, slot integer
    )
    FULL JOIN jsonb_to_recordset(p_next_state -> 'players') AS next_player(
      "participantKey" text, "deckId" uuid, slot integer
    )
      ON next_player."participantKey" = previous_player."participantKey"
    WHERE previous_player."participantKey" IS NULL
       OR next_player."participantKey" IS NULL
       OR previous_player."deckId" IS DISTINCT FROM next_player."deckId"
       OR previous_player.slot IS DISTINCT FROM next_player.slot
  ) THEN
    RAISE EXCEPTION 'Live game participants cannot be replaced' USING ERRCODE = '22023';
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

REVOKE ALL ON FUNCTION public.apply_live_game_mutation(uuid, uuid, integer, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_live_game_mutation(uuid, uuid, integer, jsonb) TO authenticated;

DROP FUNCTION IF EXISTS public.finalize_live_game(uuid, text, boolean, timestamptz, jsonb);
DROP FUNCTION IF EXISTS public.finalize_live_game(uuid, text, boolean, text, timestamptz, jsonb);

CREATE FUNCTION public.finalize_live_game(
  p_live_game_id uuid,
  p_winner_key text,
  p_is_draw boolean,
  p_win_condition text,
  p_ended_at timestamptz,
  p_players jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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
  v_state_player_count integer;
  v_active_count integer;
  v_active_key text;
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

  IF v_game.status <> 'active'
     OR jsonb_typeof(p_players) <> 'array'
     OR jsonb_typeof(v_game.state -> 'players') <> 'array' THEN
    RAISE EXCEPTION 'Invalid live game finalization' USING ERRCODE = '23514';
  END IF;

  v_state_player_count := jsonb_array_length(v_game.state -> 'players');
  IF v_state_player_count < 2 OR v_state_player_count > 6
     OR jsonb_array_length(p_players) <> v_state_player_count
     OR (SELECT count(*) <> count(DISTINCT participant_key)
         FROM jsonb_to_recordset(p_players) AS p(participant_key text))
     OR (SELECT count(*) <> count(DISTINCT p."participantKey")
         FROM jsonb_to_recordset(v_game.state -> 'players') AS p("participantKey" text)) THEN
    RAISE EXCEPTION 'Invalid live game participants' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(v_game.state -> 'players') AS state_player(
      "participantKey" text, "deckId" uuid
    )
    FULL JOIN jsonb_to_recordset(p_players) AS submitted_player(
      participant_key text, deck_id uuid
    )
      ON submitted_player.participant_key = state_player."participantKey"
    WHERE state_player."participantKey" IS NULL
       OR submitted_player.participant_key IS NULL
       OR submitted_player.deck_id IS DISTINCT FROM state_player."deckId"
  ) THEN
    RAISE EXCEPTION 'Finalization does not match the live game pod' USING ERRCODE = '22023';
  END IF;

  SELECT count(*), max(player."participantKey")
  INTO v_active_count, v_active_key
  FROM jsonb_to_recordset(v_game.state -> 'players') AS player(
    "participantKey" text, "isEliminated" boolean
  )
  WHERE NOT COALESCE(player."isEliminated", false);

  IF p_is_draw THEN
    IF p_winner_key IS NOT NULL OR p_win_condition IS NOT NULL THEN
      RAISE EXCEPTION 'A draw cannot have a winner or win condition' USING ERRCODE = '22023';
    END IF;
  ELSE
    v_winner_type := split_part(COALESCE(p_winner_key, ''), ':', 1);
    BEGIN
      v_winner_id := NULLIF(split_part(COALESCE(p_winner_key, ''), ':', 2), '')::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      v_winner_id := NULL;
    END;

    IF v_winner_type NOT IN ('user', 'guest') OR v_winner_id IS NULL
       OR p_win_condition IS NULL
       OR p_win_condition NOT IN ('last_standing', 'combo', 'concession', 'alternate_card', 'other')
       OR NOT EXISTS (
         SELECT 1 FROM jsonb_to_recordset(p_players) AS p(participant_key text)
         WHERE p.participant_key = p_winner_key
       ) THEN
      RAISE EXCEPTION 'A valid winner and win condition are required' USING ERRCODE = '22023';
    END IF;

    IF (v_active_count = 1 AND (p_win_condition <> 'last_standing' OR p_winner_key <> v_active_key))
       OR (v_active_count <> 1 AND p_win_condition = 'last_standing') THEN
      RAISE EXCEPTION 'Win condition does not match the live game state' USING ERRCODE = '22023';
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(p_players) AS p(
      participant_key text, deck_id uuid, is_guest boolean, user_id uuid, guest_id uuid
    )
    WHERE p.is_guest IS NULL
    OR p.participant_key IS DISTINCT FROM CASE
      WHEN p.is_guest THEN 'guest:' || p.guest_id::text
      ELSE 'user:' || p.user_id::text
    END
    OR (p.is_guest AND (
      p.guest_id IS NULL
      OR NOT EXISTS (
        SELECT 1 FROM public.arena_guests guest
        WHERE guest.id = p.guest_id AND guest.group_id = v_game.group_id
      )
      OR NOT EXISTS (
        SELECT 1 FROM public.arena_guest_decks deck
        WHERE deck.id = p.deck_id AND deck.guest_id = p.guest_id AND deck.group_id = v_game.group_id
      )
    )) OR (NOT p.is_guest AND (
      p.user_id IS NULL
      OR NOT public.is_group_member(v_game.group_id, p.user_id)
      OR NOT EXISTS (
        SELECT 1 FROM public.decks deck
        WHERE deck.id = p.deck_id AND deck.user_id = p.user_id
      )
    ))
  ) THEN
    RAISE EXCEPTION 'Invalid live game participants' USING ERRCODE = '22023';
  END IF;

  v_started_at := COALESCE(v_game.started_at, v_game.created_at);
  v_ended_at := GREATEST(
    v_started_at,
    LEAST(COALESCE(p_ended_at, now()), now() + interval '5 minutes')
  );
  v_duration_seconds := FLOOR(EXTRACT(EPOCH FROM (v_ended_at - v_started_at)))::integer;
  v_live_game_log := CASE
    WHEN jsonb_typeof(v_game.state -> 'events') = 'array' THEN v_game.state -> 'events'
    ELSE '[]'::jsonb
  END;

  INSERT INTO public.matches(
    group_id, created_by, is_draw, winner_id, winner_guest_id, played_at, notes,
    duration_seconds, live_game_log, win_condition
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
    v_live_game_log,
    CASE WHEN p_is_draw THEN NULL ELSE p_win_condition END
  )
  RETURNING id INTO v_match_id;

  INSERT INTO public.match_participants(
    match_id, user_id, guest_id, deck_id, guest_deck_id, is_winner
  )
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

REVOKE ALL ON FUNCTION public.finalize_live_game(uuid, text, boolean, text, timestamptz, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_live_game(uuid, text, boolean, text, timestamptz, jsonb) TO authenticated;
