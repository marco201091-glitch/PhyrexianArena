Exit code: 0
Wall time: 0.3 seconds
Output:
CREATE TABLE public.arena_guest_claim_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id uuid NOT NULL REFERENCES public.arena_guests(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE CHECK (char_length(token_hash) = 64),
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX arena_guest_claim_links_active_guest_idx
  ON public.arena_guest_claim_links(guest_id)
  WHERE revoked_at IS NULL;
CREATE INDEX arena_guest_claim_links_group_idx
  ON public.arena_guest_claim_links(group_id, created_at DESC);

ALTER TABLE public.arena_guest_claim_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY arena_guest_claim_links_manager_select
  ON public.arena_guest_claim_links FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_admin(auth.uid())
  );

GRANT SELECT ON public.arena_guest_claim_links TO authenticated;
GRANT ALL ON public.arena_guest_claim_links TO service_role;

CREATE OR REPLACE FUNCTION public.claim_arena_guest(p_token_hash text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_link public.arena_guest_claim_links%ROWTYPE;
  v_guest public.arena_guests%ROWTYPE;
  v_guest_deck public.arena_guest_decks%ROWTYPE;
  v_new_deck_id uuid;
  v_group_name text;
  v_match_count integer;
  v_deck_count integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF p_token_hash !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'Invalid claim link' USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO v_link
  FROM public.arena_guest_claim_links
  WHERE token_hash = p_token_hash
    AND revoked_at IS NULL
    AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Claim link expired or already used' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_guest
  FROM public.arena_guests
  WHERE id = v_link.guest_id
    AND group_id = v_link.group_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Guest no longer exists' USING ERRCODE = 'P0002';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.match_participants AS guest_participant
    JOIN public.match_participants AS user_participant
      ON user_participant.match_id = guest_participant.match_id
     AND user_participant.user_id = v_user_id
    WHERE guest_participant.guest_id = v_guest.id
  ) THEN
    RAISE EXCEPTION 'This account already appears in a match played by the guest'
      USING ERRCODE = '23505';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.live_games
    WHERE group_id = v_guest.group_id
      AND status IN ('setup', 'active')
      AND state::text LIKE ('%guest:' || v_guest.id::text || '%')
  ) THEN
    RAISE EXCEPTION 'Finish the active game before claiming this guest'
      USING ERRCODE = '55000';
  END IF;

  INSERT INTO public.group_members(group_id, user_id)
  VALUES (v_guest.group_id, v_user_id)
  ON CONFLICT (group_id, user_id) DO NOTHING;

  SELECT count(*)::integer
  INTO v_match_count
  FROM public.match_participants
  WHERE guest_id = v_guest.id;

  FOR v_guest_deck IN
    SELECT *
    FROM public.arena_guest_decks
    WHERE guest_id = v_guest.id
    ORDER BY created_at, id
  LOOP
    INSERT INTO public.decks(
      user_id,
      group_id,
      name,
      commander,
      commander_image,
      source_url,
      source_type,
      bracket,
      color_identity,
      commander_options,
      commander_cmc,
      created_at,
      updated_at
    )
    VALUES (
      v_user_id,
      NULL,
      v_guest_deck.name,
      v_guest_deck.commander,
      v_guest_deck.commander_image,
      NULL,
      'manual',
      v_guest_deck.bracket,
      v_guest_deck.color_identity,
      v_guest_deck.commander_options,
      v_guest_deck.commander_cmc,
      v_guest_deck.created_at,
      COALESCE(v_guest_deck.updated_at, now())
    )
    RETURNING id INTO v_new_deck_id;

    UPDATE public.match_participants
    SET
      user_id = v_user_id,
      guest_id = NULL,
      deck_id = v_new_deck_id,
      guest_deck_id = NULL
    WHERE guest_id = v_guest.id
      AND guest_deck_id = v_guest_deck.id;

    v_deck_count := v_deck_count + 1;
  END LOOP;

  UPDATE public.match_participants
  SET
    user_id = v_user_id,
    guest_id = NULL,
    deck_id = NULL,
    guest_deck_id = NULL
  WHERE guest_id = v_guest.id;

  UPDATE public.matches
  SET
    winner_id = v_user_id,
    winner_guest_id = NULL
  WHERE winner_guest_id = v_guest.id;

  SELECT name INTO v_group_name
  FROM public.groups
  WHERE id = v_guest.group_id;

  DELETE FROM public.arena_guests WHERE id = v_guest.id;

  RETURN jsonb_build_object(
    'groupId', v_guest.group_id,
    'groupName', v_group_name,
    'displayName', v_guest.display_name,
    'transferredDecks', v_deck_count,
    'transferredMatches', v_match_count
  );
END;
$$;
REVOKE ALL ON FUNCTION public.claim_arena_guest(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_arena_guest(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_arena_guest(text) TO service_role;
