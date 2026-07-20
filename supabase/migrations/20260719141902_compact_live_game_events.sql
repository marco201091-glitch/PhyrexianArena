-- Routine life, commander and infect changes are represented by the cumulative
-- state.summary counters. Keep only a small significant-event stream so every
-- live_games Realtime payload and finalized match log stays bounded.
CREATE OR REPLACE FUNCTION private.compact_live_game_events()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_compact_events jsonb;
BEGIN
  IF pg_catalog.jsonb_typeof(NEW.state) <> 'object'
     OR pg_catalog.jsonb_typeof(NEW.state -> 'events') <> 'array' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(
    pg_catalog.jsonb_agg(retained.event_value ORDER BY retained.ordinality),
    '[]'::jsonb
  )
  INTO v_compact_events
  FROM (
    SELECT event_value, ordinality
    FROM pg_catalog.jsonb_array_elements(NEW.state -> 'events')
      WITH ORDINALITY AS event(event_value, ordinality)
    WHERE event_value ->> 'type' IN ('elimination', 'revive')
    ORDER BY ordinality DESC
    LIMIT 24
  ) AS retained;

  NEW.state := pg_catalog.jsonb_set(
    NEW.state,
    '{events}',
    v_compact_events,
    true
  );
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.compact_live_game_events()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS live_games_compact_events ON public.live_games;
CREATE TRIGGER live_games_compact_events
  BEFORE INSERT OR UPDATE OF state ON public.live_games
  FOR EACH ROW
  EXECUTE FUNCTION private.compact_live_game_events();

COMMENT ON FUNCTION private.compact_live_game_events() IS
  'Retains at most 24 elimination/revive highlights; routine gameplay is stored in state.summary.';

COMMENT ON COLUMN public.matches.live_game_log IS
  'Bounded significant live-game events (eliminations and revives); routine gameplay is stored as participant metrics.';
