-- Persist many optimistic tracker actions with one database round trip.
-- The whole batch is transactional and idempotent.
CREATE OR REPLACE FUNCTION public.apply_live_game_mutation_batch(
  p_live_game_id uuid,
  p_mutation_ids uuid[],
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
  v_batch_size integer;
  v_existing_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  v_batch_size := cardinality(p_mutation_ids);
  IF v_batch_size IS NULL OR v_batch_size < 1 OR v_batch_size > 40
     OR (
       SELECT count(DISTINCT queued.mutation_id)
       FROM unnest(p_mutation_ids) AS queued(mutation_id)
     ) <> v_batch_size THEN
    RAISE EXCEPTION 'Invalid live game mutation batch' USING ERRCODE = '22023';
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

  SELECT count(*) INTO v_existing_count
  FROM public.live_game_mutations AS mutation
  WHERE mutation.live_game_id = p_live_game_id
    AND mutation.id = ANY(p_mutation_ids);

  IF v_existing_count = v_batch_size THEN
    RETURN jsonb_build_object('applied', true, 'duplicate', true, 'record', to_jsonb(v_game));
  ELSIF v_existing_count > 0 THEN
    RAISE EXCEPTION 'Partially applied live game mutation batch' USING ERRCODE = '23505';
  END IF;

  v_state_version := COALESCE((v_game.state ->> 'version')::integer, 0);
  IF v_state_version <> p_expected_version THEN
    RETURN jsonb_build_object('applied', false, 'duplicate', false, 'record', to_jsonb(v_game));
  END IF;

  IF jsonb_typeof(p_next_state) <> 'object'
     OR jsonb_typeof(p_next_state -> 'players') <> 'array'
     OR jsonb_typeof(p_next_state -> 'events') <> 'array'
     OR COALESCE((p_next_state ->> 'version')::integer, -1) <> p_expected_version + v_batch_size
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
  SELECT
    queued.mutation_id,
    p_live_game_id,
    p_expected_version + queued.ordinality::integer
  FROM unnest(p_mutation_ids) WITH ORDINALITY AS queued(mutation_id, ordinality);

  RETURN jsonb_build_object('applied', true, 'duplicate', false, 'record', to_jsonb(v_game));
END;
$$;

REVOKE ALL ON FUNCTION public.apply_live_game_mutation_batch(uuid, uuid[], integer, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_live_game_mutation_batch(uuid, uuid[], integer, jsonb)
  TO authenticated;

-- A live match belongs to the session in which it started, even when saved
-- after midnight. Duration and ended_at still use the real finishing time.
CREATE OR REPLACE FUNCTION private.sync_live_game_match_started_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.match_id IS NOT NULL AND NEW.match_id IS DISTINCT FROM OLD.match_id THEN
    UPDATE public.matches
    SET played_at = COALESCE(NEW.started_at, NEW.created_at)
    WHERE id = NEW.match_id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.sync_live_game_match_started_at()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS live_games_sync_match_started_at ON public.live_games;
CREATE TRIGGER live_games_sync_match_started_at
  AFTER UPDATE OF match_id ON public.live_games
  FOR EACH ROW
  EXECUTE FUNCTION private.sync_live_game_match_started_at();
