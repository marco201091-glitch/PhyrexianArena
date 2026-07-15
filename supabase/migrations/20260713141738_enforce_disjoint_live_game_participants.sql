-- Active live games may coexist inside an arena, but a participant can only
-- belong to one of them. This normalized projection also makes participant-
-- scoped resume queries indexable instead of scanning JSON state.

CREATE TABLE public.live_game_participants (
  live_game_id uuid NOT NULL REFERENCES public.live_games(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  participant_key text NOT NULL CHECK (length(participant_key) BETWEEN 6 AND 64),
  PRIMARY KEY (live_game_id, participant_key)
);

CREATE UNIQUE INDEX live_game_participants_active_key
  ON public.live_game_participants(group_id, participant_key);

CREATE INDEX live_game_participants_game_idx
  ON public.live_game_participants(live_game_id);

ALTER TABLE public.live_game_participants ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.live_game_participants FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.live_game_participants TO authenticated;

CREATE POLICY "live_game_participants_select_group_members"
  ON public.live_game_participants
  FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND public.is_group_member(group_id, (SELECT auth.uid()))
  );

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;

CREATE OR REPLACE FUNCTION private.sync_live_game_participants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_old_keys jsonb;
  v_new_keys jsonb;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    v_old_keys := pg_catalog.jsonb_path_query_array(OLD.state, '$.players[*].participantKey');
    v_new_keys := pg_catalog.jsonb_path_query_array(NEW.state, '$.players[*].participantKey');

    IF OLD.status = NEW.status
      AND OLD.group_id = NEW.group_id
      AND v_old_keys = v_new_keys THEN
      RETURN NEW;
    END IF;
  END IF;

  DELETE FROM public.live_game_participants
  WHERE live_game_id = NEW.id;

  IF NEW.status = 'active' THEN
    INSERT INTO public.live_game_participants(live_game_id, group_id, participant_key)
    SELECT DISTINCT
      NEW.id,
      NEW.group_id,
      player ->> 'participantKey'
    FROM pg_catalog.jsonb_array_elements(COALESCE(NEW.state -> 'players', '[]'::jsonb)) AS player
    WHERE pg_catalog.jsonb_typeof(player) = 'object'
      AND length(COALESCE(player ->> 'participantKey', '')) BETWEEN 6 AND 64;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.sync_live_game_participants() FROM PUBLIC;

CREATE TRIGGER live_games_sync_participants
  AFTER INSERT OR UPDATE OF group_id, status, state
  ON public.live_games
  FOR EACH ROW
  EXECUTE FUNCTION private.sync_live_game_participants();

INSERT INTO public.live_game_participants(live_game_id, group_id, participant_key)
SELECT DISTINCT
  game.id,
  game.group_id,
  player ->> 'participantKey'
FROM public.live_games AS game
CROSS JOIN LATERAL pg_catalog.jsonb_array_elements(
  COALESCE(game.state -> 'players', '[]'::jsonb)
) AS player
WHERE game.status = 'active'
  AND pg_catalog.jsonb_typeof(player) = 'object'
  AND length(COALESCE(player ->> 'participantKey', '')) BETWEEN 6 AND 64;
