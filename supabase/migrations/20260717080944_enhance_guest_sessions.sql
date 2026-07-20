ALTER TABLE public.live_game_lobbies
  ADD COLUMN realtime_topic text,
  ADD COLUMN closed_at timestamptz;

UPDATE public.live_game_lobbies
SET realtime_topic = encode(extensions.gen_random_bytes(24), 'hex')
WHERE realtime_topic IS NULL;

ALTER TABLE public.live_game_lobbies
  ALTER COLUMN realtime_topic SET NOT NULL,
  ADD CONSTRAINT live_game_lobbies_realtime_topic_key UNIQUE (realtime_topic),
  ADD CONSTRAINT live_game_lobbies_realtime_topic_length CHECK (char_length(realtime_topic) = 48);

CREATE TABLE public.public_counter_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_token_hash text NOT NULL UNIQUE CHECK (char_length(invite_token_hash) = 64),
  host_session_hash text NOT NULL UNIQUE CHECK (char_length(host_session_hash) = 64),
  realtime_topic text NOT NULL UNIQUE CHECK (char_length(realtime_topic) = 48),
  format text NOT NULL CHECK (format IN ('commander', 'classic')),
  state jsonb,
  started_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '12 hours'),
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (state IS NULL OR (
    jsonb_typeof(state) = 'object'
    AND jsonb_typeof(state -> 'players') = 'array'
    AND jsonb_array_length(state -> 'players') BETWEEN 1 AND 6
    AND pg_column_size(state) <= 1048576
  ))
);

CREATE INDEX public_counter_sessions_expiry_idx
  ON public.public_counter_sessions(expires_at)
  WHERE closed_at IS NULL;

CREATE TABLE public.public_counter_guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.public_counter_sessions(id) ON DELETE CASCADE,
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 2 AND 40),
  deck_name text NOT NULL CHECK (char_length(deck_name) BETWEEN 1 AND 80),
  commander text NOT NULL CHECK (char_length(commander) BETWEEN 1 AND 120),
  commander_image text,
  color_identity text[] NOT NULL DEFAULT '{}',
  guest_session_hash text NOT NULL UNIQUE CHECK (char_length(guest_session_hash) = 64),
  recovery_code_hash text NOT NULL UNIQUE CHECK (char_length(recovery_code_hash) = 64),
  ready boolean NOT NULL DEFAULT false,
  revoked_at timestamptz,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, display_name)
);

CREATE INDEX public_counter_guests_session_idx
  ON public.public_counter_guests(session_id, joined_at);

ALTER TABLE public.public_counter_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_counter_guests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.public_counter_sessions, public.public_counter_guests
  FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.public_counter_sessions, public.public_counter_guests
  TO service_role;

CREATE OR REPLACE FUNCTION private.broadcast_guest_live_game_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_topic text;
BEGIN
  IF NEW.state IS NOT DISTINCT FROM OLD.state THEN
    RETURN NEW;
  END IF;

  FOR v_topic IN
    SELECT lobby.realtime_topic
    FROM public.live_game_lobbies AS lobby
    WHERE lobby.live_game_id = NEW.id
      AND lobby.closed_at IS NULL
      AND lobby.expires_at > now()
  LOOP
    PERFORM realtime.send(
      jsonb_build_object('version', COALESCE((NEW.state ->> 'version')::integer, 0)),
      'state',
      'game:' || v_topic,
      false
    );
  END LOOP;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.broadcast_guest_live_game_state()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS broadcast_guest_live_game_state_trigger ON public.live_games;
CREATE TRIGGER broadcast_guest_live_game_state_trigger
  AFTER UPDATE OF state ON public.live_games
  FOR EACH ROW
  EXECUTE FUNCTION private.broadcast_guest_live_game_state();

CREATE OR REPLACE FUNCTION private.broadcast_public_counter_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.state IS DISTINCT FROM OLD.state OR NEW.closed_at IS DISTINCT FROM OLD.closed_at THEN
    PERFORM realtime.send(
      jsonb_build_object(
        'version', COALESCE((NEW.state ->> 'version')::integer, 0),
        'closed', NEW.closed_at IS NOT NULL
      ),
      'state',
      'counter:' || NEW.realtime_topic,
      false
    );
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.broadcast_public_counter_state()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER broadcast_public_counter_state_trigger
  AFTER UPDATE OF state, closed_at ON public.public_counter_sessions
  FOR EACH ROW
  EXECUTE FUNCTION private.broadcast_public_counter_state();

CREATE OR REPLACE FUNCTION public.purge_finished_guest_sessions()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_live_count integer;
  v_counter_count integer;
BEGIN
  DELETE FROM public.live_game_lobbies AS lobby
  WHERE lobby.expires_at <= now()
     OR lobby.closed_at <= now() - interval '1 hour'
     OR EXISTS (
       SELECT 1
       FROM public.live_games AS game
       WHERE game.id = lobby.live_game_id
         AND game.status <> 'active'
         AND game.updated_at <= now() - interval '1 hour'
     );
  GET DIAGNOSTICS v_live_count = ROW_COUNT;

  DELETE FROM public.public_counter_sessions
  WHERE expires_at <= now()
     OR closed_at <= now() - interval '1 hour';
  GET DIAGNOSTICS v_counter_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'liveGameSessions', v_live_count,
    'publicCounterSessions', v_counter_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.purge_finished_guest_sessions()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_finished_guest_sessions()
  TO service_role;
