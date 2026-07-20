-- Keep historical display snapshots consistent when a deck is selected or
-- replaced after a match. The trigger centralizes the rule for every client
-- (web, Android, and iOS) without adding any read round-trips.
CREATE OR REPLACE FUNCTION private.sync_match_participant_deck_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_deck_name text;
  v_commander text;
  v_commander_image text;
  v_bracket text;
  v_color_identity text[];
BEGIN
  IF NEW.deck_id IS NOT NULL AND NEW.guest_deck_id IS NOT NULL THEN
    RAISE EXCEPTION 'A participant cannot use both a member deck and a guest deck'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.deck_id IS NOT NULL THEN
    SELECT
      deck.name,
      deck.commander,
      deck.commander_image,
      deck.bracket,
      deck.color_identity
    INTO
      v_deck_name,
      v_commander,
      v_commander_image,
      v_bracket,
      v_color_identity
    FROM public.decks AS deck
    WHERE deck.id = NEW.deck_id
      AND deck.user_id = NEW.user_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid member deck selection'
        USING ERRCODE = '23503';
    END IF;
  ELSIF NEW.guest_deck_id IS NOT NULL THEN
    SELECT
      deck.name,
      deck.commander,
      deck.commander_image,
      deck.bracket,
      deck.color_identity
    INTO
      v_deck_name,
      v_commander,
      v_commander_image,
      v_bracket,
      v_color_identity
    FROM public.arena_guest_decks AS deck
    WHERE deck.id = NEW.guest_deck_id
      AND deck.guest_id = NEW.guest_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid guest deck selection'
        USING ERRCODE = '23503';
    END IF;
  END IF;

  NEW.deck_name_snapshot = v_deck_name;
  NEW.commander_snapshot = v_commander;
  NEW.commander_image_snapshot = v_commander_image;
  NEW.deck_bracket_snapshot = v_bracket;
  NEW.color_identity_snapshot = v_color_identity;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.sync_match_participant_deck_snapshot()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS sync_match_participant_deck_snapshot_on_insert
  ON public.match_participants;
CREATE TRIGGER sync_match_participant_deck_snapshot_on_insert
BEFORE INSERT ON public.match_participants
FOR EACH ROW
EXECUTE FUNCTION private.sync_match_participant_deck_snapshot();

DROP TRIGGER IF EXISTS sync_match_participant_deck_snapshot_on_deck_update
  ON public.match_participants;
CREATE TRIGGER sync_match_participant_deck_snapshot_on_deck_update
BEFORE UPDATE OF deck_id, guest_deck_id ON public.match_participants
FOR EACH ROW
EXECUTE FUNCTION private.sync_match_participant_deck_snapshot();
