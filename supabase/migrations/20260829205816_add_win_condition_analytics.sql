-- Additive analytics data. Extra result columns are ignored by 8.1 clients.
DROP FUNCTION IF EXISTS public.get_personal_analytics_facts(uuid);

CREATE FUNCTION public.get_personal_analytics_facts(p_user_id uuid DEFAULT NULL)
RETURNS TABLE (
  is_winner boolean, deck_id uuid, played_at timestamptz, win_condition text,
  name text, commander text, commander_image text, color_identity text[],
  bracket text, source_type text, source_url text, owner_username text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT participant.is_winner, participant.deck_id, match.played_at, match.win_condition,
    COALESCE(participant.deck_name_snapshot, deck.name, 'Deck'),
    COALESCE(participant.commander_snapshot, deck.commander, 'Unknown commander'),
    COALESCE(participant.commander_image_snapshot, deck.commander_image),
    COALESCE(participant.color_identity_snapshot, deck.color_identity, '{}'::text[]),
    COALESCE(participant.deck_bracket_snapshot, deck.bracket),
    deck.source_type, deck.source_url, profile.username
  FROM public.match_participants AS participant
  JOIN public.matches AS match ON match.id = participant.match_id
  LEFT JOIN public.decks AS deck ON deck.id = participant.deck_id
  LEFT JOIN public.profiles AS profile ON profile.id = participant.user_id
  WHERE participant.user_id = COALESCE(p_user_id, (SELECT auth.uid()))
    AND participant.deck_id IS NOT NULL
    AND (participant.user_id = (SELECT auth.uid()) OR public.is_admin((SELECT auth.uid())))
  ORDER BY match.played_at;
$$;

REVOKE ALL ON FUNCTION public.get_personal_analytics_facts(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_personal_analytics_facts(uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.get_global_analytics_facts();

CREATE FUNCTION public.get_global_analytics_facts()
RETURNS TABLE (
  is_winner boolean, deck_id uuid, played_at timestamptz, win_condition text,
  name text, commander text, commander_image text, color_identity text[],
  bracket text, source_type text, source_url text, owner_username text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT participant.is_winner, participant.deck_id, match.played_at, match.win_condition,
    COALESCE(participant.deck_name_snapshot, deck.name, 'Deck'),
    COALESCE(participant.commander_snapshot, deck.commander, 'Unknown commander'),
    COALESCE(participant.commander_image_snapshot, deck.commander_image),
    COALESCE(participant.color_identity_snapshot, deck.color_identity, '{}'::text[]),
    COALESCE(participant.deck_bracket_snapshot, deck.bracket),
    deck.source_type, deck.source_url, profile.username
  FROM public.match_participants AS participant
  JOIN public.matches AS match ON match.id = participant.match_id
  LEFT JOIN public.decks AS deck ON deck.id = participant.deck_id
  LEFT JOIN public.profiles AS profile ON profile.id = participant.user_id
  WHERE participant.user_id IS NOT NULL
    AND participant.deck_id IS NOT NULL
    AND participant.user_id NOT IN (
      SELECT excluded.excluded_user_id
      FROM public.get_analytics_excluded_user_ids() AS excluded(excluded_user_id)
    )
  ORDER BY match.played_at;
$$;

REVOKE ALL ON FUNCTION public.get_global_analytics_facts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_global_analytics_facts() TO service_role;
