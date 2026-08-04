-- Keep the tested aggregate function as the data source, then enrich each physical
-- deck row.  Rankings must never merge two owners' decks merely because the
-- commander or bracket matches.
ALTER FUNCTION public.get_arena_analytics_bundle(uuid, timestamptz, timestamptz)
  RENAME TO get_arena_analytics_bundle_base;

CREATE FUNCTION public.get_arena_analytics_bundle(
  p_group_id uuid,
  p_since timestamptz DEFAULT NULL,
  p_until timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH payload AS (
    SELECT public.get_arena_analytics_bundle_base(p_group_id, p_since, p_until) AS value
  )
  SELECT pg_catalog.jsonb_set(
    value,
    '{decks}',
    COALESCE((
      SELECT pg_catalog.jsonb_agg(
        item.value || pg_catalog.jsonb_build_object(
          'bracket', COALESCE(deck.bracket, guest_deck.bracket),
          'owner_display_name', COALESCE(
            NULLIF(deck_owner.display_name, ''), deck_owner.username,
            guest_owner.display_name, 'Player'
          )
        )
      )
      FROM pg_catalog.jsonb_array_elements(value->'decks') AS item(value)
      LEFT JOIN public.decks AS deck
        ON NOT COALESCE((item.value->>'is_guest_deck')::boolean, false)
       AND deck.id = (item.value->>'deck_id')::uuid
      LEFT JOIN public.profiles AS deck_owner ON deck_owner.id = deck.user_id
      LEFT JOIN public.arena_guest_decks AS guest_deck
        ON COALESCE((item.value->>'is_guest_deck')::boolean, false)
       AND guest_deck.id = (item.value->>'deck_id')::uuid
      LEFT JOIN public.arena_guests AS guest_owner ON guest_owner.id = guest_deck.guest_id
    ), '[]'::jsonb)
  )
  FROM payload;
$$;

REVOKE ALL ON FUNCTION public.get_arena_analytics_bundle(uuid, timestamptz, timestamptz)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_arena_analytics_bundle(uuid, timestamptz, timestamptz)
  TO authenticated;

NOTIFY pgrst, 'reload schema';
