CREATE TABLE public.live_game_lobbies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_token_hash text NOT NULL UNIQUE CHECK (char_length(invite_token_hash) = 64),
  live_game_id uuid REFERENCES public.live_games(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '12 hours'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX live_game_lobbies_creator_idx
  ON public.live_game_lobbies(created_by, created_at DESC);

CREATE TABLE public.live_game_lobby_guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_id uuid NOT NULL REFERENCES public.live_game_lobbies(id) ON DELETE CASCADE,
  guest_id uuid NOT NULL REFERENCES public.arena_guests(id) ON DELETE CASCADE,
  guest_deck_id uuid NOT NULL REFERENCES public.arena_guest_decks(id) ON DELETE CASCADE,
  session_token_hash text NOT NULL UNIQUE CHECK (char_length(session_token_hash) = 64),
  recovery_code_hash text NOT NULL UNIQUE CHECK (char_length(recovery_code_hash) = 64),
  ready boolean NOT NULL DEFAULT false,
  revoked_at timestamptz,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lobby_id, guest_id)
);

CREATE INDEX live_game_lobby_guests_lobby_idx
  ON public.live_game_lobby_guests(lobby_id, joined_at);

ALTER TABLE public.live_game_lobbies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_game_lobby_guests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.live_game_lobbies, public.live_game_lobby_guests FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.live_game_lobbies, public.live_game_lobby_guests TO service_role;

CREATE FUNCTION public.apply_guest_live_game_state(
  p_session_token_hash text,
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
  v_live_game_id uuid;
  v_current_version integer;
  v_player_count integer;
BEGIN
  SELECT lobby.live_game_id INTO v_live_game_id
  FROM public.live_game_lobby_guests AS guest
  JOIN public.live_game_lobbies AS lobby ON lobby.id = guest.lobby_id
  WHERE guest.session_token_hash = p_session_token_hash
    AND guest.revoked_at IS NULL
    AND lobby.expires_at > now();

  IF v_live_game_id IS NULL THEN
    RAISE EXCEPTION 'Guest session unavailable' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_game
  FROM public.live_games
  WHERE id = v_live_game_id
  FOR UPDATE;

  IF NOT FOUND OR v_game.status <> 'active' THEN
    RAISE EXCEPTION 'Live game unavailable' USING ERRCODE = '42501';
  END IF;

  v_current_version := COALESCE((v_game.state ->> 'version')::integer, 0);
  IF v_current_version <> p_expected_version THEN
    RETURN jsonb_build_object('applied', false, 'record', to_jsonb(v_game));
  END IF;

  IF pg_catalog.jsonb_typeof(p_next_state) <> 'object'
     OR pg_catalog.jsonb_typeof(p_next_state -> 'players') <> 'array'
     OR pg_catalog.jsonb_typeof(p_next_state -> 'events') <> 'array'
     OR COALESCE((p_next_state ->> 'version')::integer, -1) <> p_expected_version + 1
     OR pg_catalog.pg_column_size(p_next_state) > 1048576 THEN
    RAISE EXCEPTION 'Invalid guest game state' USING ERRCODE = '22023';
  END IF;

  v_player_count := pg_catalog.jsonb_array_length(p_next_state -> 'players');
  IF v_player_count < 2 OR v_player_count > 6
     OR pg_catalog.jsonb_array_length(p_next_state -> 'events') > 500
     OR v_player_count <> pg_catalog.jsonb_array_length(v_game.state -> 'players') THEN
    RAISE EXCEPTION 'Invalid guest game state size' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.jsonb_to_recordset(v_game.state -> 'players') AS previous_player(
      "participantKey" text, "deckId" uuid, slot integer
    )
    FULL JOIN pg_catalog.jsonb_to_recordset(p_next_state -> 'players') AS next_player(
      "participantKey" text, "deckId" uuid, slot integer
    ) ON next_player."participantKey" = previous_player."participantKey"
    WHERE previous_player."participantKey" IS NULL
       OR next_player."participantKey" IS NULL
       OR previous_player."deckId" IS DISTINCT FROM next_player."deckId"
       OR previous_player.slot IS DISTINCT FROM next_player.slot
  ) THEN
    RAISE EXCEPTION 'Guest game participants cannot be replaced' USING ERRCODE = '22023';
  END IF;

  UPDATE public.live_games
  SET state = p_next_state
  WHERE id = v_live_game_id
  RETURNING * INTO v_game;

  RETURN jsonb_build_object('applied', true, 'record', to_jsonb(v_game));
END;
$$;

REVOKE ALL ON FUNCTION public.apply_guest_live_game_state(text, integer, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_guest_live_game_state(text, integer, jsonb)
  TO service_role;
