-- Load one arena day's match cards in a single authorized query. This avoids
-- applying nested RLS policies independently to every embedded REST relation.
CREATE OR REPLACE FUNCTION public.get_arena_matches_for_day(
  p_group_id uuid,
  p_start timestamptz,
  p_end timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_result jsonb;
BEGIN
  IF v_user_id IS NULL OR NOT (
    public.is_admin(v_user_id)
    OR public.is_group_member(p_group_id, v_user_id)
  ) THEN
    RAISE EXCEPTION 'Not authorized to view this arena'
      USING ERRCODE = '42501';
  END IF;

  IF p_start IS NULL OR p_end IS NULL OR p_start >= p_end OR p_end - p_start > interval '48 hours' THEN
    RAISE EXCEPTION 'Invalid arena day range'
      USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      to_jsonb(match_row)
      || jsonb_build_object(
        'winner', CASE
          WHEN winner_profile.id IS NULL THEN NULL
          ELSE jsonb_build_object(
            'id', winner_profile.id,
            'username', winner_profile.username,
            'display_name', winner_profile.display_name
          )
        END,
        'winner_guest', CASE
          WHEN winner_guest.id IS NULL THEN NULL
          ELSE jsonb_build_object(
            'id', winner_guest.id,
            'display_name', winner_guest.display_name
          )
        END,
        'match_participants', COALESCE(participant_rows.items, '[]'::jsonb)
      )
      ORDER BY match_row.played_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_result
  FROM public.matches AS match_row
  LEFT JOIN public.profiles AS winner_profile
    ON winner_profile.id = match_row.winner_id
  LEFT JOIN public.arena_guests AS winner_guest
    ON winner_guest.id = match_row.winner_guest_id
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(
      to_jsonb(participant)
      || jsonb_build_object(
        'profiles', CASE
          WHEN participant_profile.id IS NULL THEN NULL
          ELSE jsonb_build_object(
            'id', participant_profile.id,
            'username', participant_profile.username,
            'display_name', participant_profile.display_name
          )
        END,
        'arena_guests', CASE
          WHEN participant_guest.id IS NULL THEN NULL
          ELSE jsonb_build_object(
            'id', participant_guest.id,
            'display_name', participant_guest.display_name
          )
        END,
        'decks', CASE
          WHEN participant_deck.id IS NULL THEN NULL
          ELSE jsonb_build_object(
            'name', participant_deck.name,
            'commander', participant_deck.commander,
            'commander_image', participant_deck.commander_image,
            'bracket', participant_deck.bracket,
            'color_identity', participant_deck.color_identity,
            'source_type', participant_deck.source_type
          )
        END,
        'arena_guest_decks', CASE
          WHEN participant_guest_deck.id IS NULL THEN NULL
          ELSE jsonb_build_object(
            'name', participant_guest_deck.name,
            'commander', participant_guest_deck.commander,
            'commander_image', participant_guest_deck.commander_image,
            'bracket', participant_guest_deck.bracket,
            'color_identity', participant_guest_deck.color_identity
          )
        END
      )
      ORDER BY participant.id
    ) AS items
    FROM public.match_participants AS participant
    LEFT JOIN public.profiles AS participant_profile
      ON participant_profile.id = participant.user_id
    LEFT JOIN public.arena_guests AS participant_guest
      ON participant_guest.id = participant.guest_id
    LEFT JOIN public.decks AS participant_deck
      ON participant_deck.id = participant.deck_id
    LEFT JOIN public.arena_guest_decks AS participant_guest_deck
      ON participant_guest_deck.id = participant.guest_deck_id
    WHERE participant.match_id = match_row.id
  ) AS participant_rows ON true
  WHERE match_row.group_id = p_group_id
    AND match_row.played_at >= p_start
    AND match_row.played_at < p_end;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_arena_matches_for_day(uuid, timestamptz, timestamptz)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_arena_matches_for_day(uuid, timestamptz, timestamptz)
  TO authenticated;
