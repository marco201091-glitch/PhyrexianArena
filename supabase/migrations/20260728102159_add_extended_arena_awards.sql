CREATE OR REPLACE FUNCTION public.get_arena_analytics_bundle(
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
  WITH facts AS MATERIALIZED (
    SELECT
      match.id AS match_id,
      match.played_at,
      match.duration_seconds,
      match.tracking_version,
      match.win_condition,
      participant.user_id,
      participant.guest_id,
      participant.deck_id,
      participant.guest_deck_id,
      participant.is_winner,
      participant.placement,
      participant.final_life,
      participant.eliminated_at,
      (
        participant.eliminated_at IS NOT NULL
        AND participant.eliminated_at = min(participant.eliminated_at)
          OVER (PARTITION BY match.id)
      ) AS was_first_eliminated,
      participant.life_lost,
      participant.life_gained,
      participant.life_damage_dealt,
      participant.commander_damage_dealt,
      participant.infect_dealt,
      participant.eliminations_caused,
      participant.group_damage_dealt,
      participant.group_damage_events,
      COALESCE(
        participant.participant_name_snapshot,
        guest.display_name,
        NULLIF(profile.display_name, ''),
        profile.username,
        'Player'
      ) AS participant_name,
      COALESCE(participant.deck_name_snapshot, deck.name, guest_deck.name, 'Deck') AS deck_name,
      COALESCE(participant.commander_snapshot, deck.commander, guest_deck.commander, 'Unknown commander') AS commander,
      COALESCE(participant.commander_image_snapshot, deck.commander_image, guest_deck.commander_image) AS commander_image,
      COALESCE(participant.deck_bracket_snapshot, deck.bracket, guest_deck.bracket) AS bracket,
      COALESCE(participant.color_identity_snapshot, deck.color_identity, guest_deck.color_identity, '{}'::text[]) AS color_identity
    FROM public.matches AS match
    JOIN public.match_participants AS participant ON participant.match_id = match.id
    LEFT JOIN public.profiles AS profile ON profile.id = participant.user_id
    LEFT JOIN public.arena_guests AS guest ON guest.id = participant.guest_id
    LEFT JOIN public.decks AS deck ON deck.id = participant.deck_id
    LEFT JOIN public.arena_guest_decks AS guest_deck ON guest_deck.id = participant.guest_deck_id
    WHERE match.group_id = p_group_id
      AND (p_since IS NULL OR match.played_at >= p_since)
      AND (p_until IS NULL OR match.played_at < p_until)
      AND (
        public.is_admin((SELECT auth.uid()))
        OR public.is_group_member(p_group_id, (SELECT auth.uid()))
      )
  ),
  player_rollup AS (
    SELECT
      CASE WHEN user_id IS NOT NULL THEN 'user:' || user_id::text ELSE 'guest:' || guest_id::text END AS key,
      user_id,
      guest_id,
      (array_agg(participant_name ORDER BY played_at DESC))[1] AS display_name,
      guest_id IS NOT NULL AS is_guest,
      count(*)::integer AS games_played,
      count(*) FILTER (WHERE is_winner)::integer AS wins
    FROM facts
    GROUP BY key, user_id, guest_id, guest_id IS NOT NULL
  ),
  commander_rollup AS (
    SELECT
      commander,
      commander_image,
      bracket,
      count(*)::integer AS games_played,
      count(*) FILTER (WHERE is_winner)::integer AS wins
    FROM facts
    GROUP BY commander, commander_image, bracket
  ),
  color_rollup AS (
    SELECT
      color_identity,
      bracket,
      count(*)::integer AS appearances,
      count(*) FILTER (WHERE is_winner)::integer AS wins
    FROM facts
    GROUP BY color_identity, bracket
  ),
  deck_rollup AS (
    SELECT
      CASE WHEN deck_id IS NOT NULL THEN 'deck:' || deck_id::text ELSE 'guest:' || guest_deck_id::text END AS key,
      COALESCE(deck_id, guest_deck_id) AS deck_id,
      guest_deck_id IS NOT NULL AS is_guest_deck,
      (array_agg(deck_name ORDER BY played_at DESC))[1] AS deck_name,
      (array_agg(commander ORDER BY played_at DESC))[1] AS commander,
      (array_agg(commander_image ORDER BY played_at DESC))[1] AS commander_image,
      count(*)::integer AS games_played,
      count(*) FILTER (
        WHERE tracking_version IS NOT NULL OR duration_seconds IS NOT NULL
      )::integer AS tracked_games,
      count(*) FILTER (WHERE is_winner)::integer AS wins,
      count(*) FILTER (WHERE placement = 2)::integer AS second_places,
      count(*) FILTER (WHERE was_first_eliminated)::integer AS first_eliminations,
      count(*) FILTER (
        WHERE is_winner AND final_life IS NOT NULL AND final_life < 10
      )::integer AS comeback_wins,
      count(*) FILTER (WHERE is_winner AND win_condition = 'combo')::integer AS combo_wins,
      count(*) FILTER (WHERE is_winner AND win_condition = 'alternate_card')::integer AS alternate_wins,
      COALESCE(sum(life_damage_dealt) FILTER (
        WHERE tracking_version IS NOT NULL OR duration_seconds IS NOT NULL
      ), 0)::integer AS total_damage_dealt,
      COALESCE(sum(life_lost) FILTER (
        WHERE tracking_version IS NOT NULL OR duration_seconds IS NOT NULL
      ), 0)::integer AS total_damage_taken,
      COALESCE(sum(life_gained) FILTER (
        WHERE tracking_version IS NOT NULL OR duration_seconds IS NOT NULL
      ), 0)::integer AS total_life_gained,
      COALESCE(sum(commander_damage_dealt) FILTER (
        WHERE tracking_version IS NOT NULL OR duration_seconds IS NOT NULL
      ), 0)::integer AS commander_damage_dealt,
      COALESCE(sum(infect_dealt) FILTER (
        WHERE tracking_version IS NOT NULL OR duration_seconds IS NOT NULL
      ), 0)::integer AS infect_dealt,
      COALESCE(sum(eliminations_caused) FILTER (
        WHERE tracking_version IS NOT NULL OR duration_seconds IS NOT NULL
      ), 0)::integer AS eliminations,
      COALESCE(sum(group_damage_dealt) FILTER (
        WHERE tracking_version IS NOT NULL OR duration_seconds IS NOT NULL
      ), 0)::integer AS group_damage_dealt,
      COALESCE(sum(group_damage_events) FILTER (
        WHERE tracking_version IS NOT NULL OR duration_seconds IS NOT NULL
      ), 0)::integer AS group_damage_events,
      round(percentile_cont(0.5) WITHIN GROUP (ORDER BY duration_seconds)
        FILTER (WHERE is_winner AND duration_seconds IS NOT NULL))::integer
        AS median_winning_duration_seconds
    FROM facts
    WHERE deck_id IS NOT NULL OR guest_deck_id IS NOT NULL
    GROUP BY key, COALESCE(deck_id, guest_deck_id), guest_deck_id IS NOT NULL
  )
  SELECT pg_catalog.jsonb_build_object(
    'players', COALESCE((SELECT pg_catalog.jsonb_agg(player_rollup) FROM player_rollup), '[]'::jsonb),
    'commanders', COALESCE((SELECT pg_catalog.jsonb_agg(commander_rollup) FROM commander_rollup), '[]'::jsonb),
    'colors', COALESCE((SELECT pg_catalog.jsonb_agg(color_rollup) FROM color_rollup), '[]'::jsonb),
    'decks', COALESCE((SELECT pg_catalog.jsonb_agg(deck_rollup) FROM deck_rollup), '[]'::jsonb),
    'totalMatches', (SELECT count(DISTINCT match_id)::integer FROM facts)
  );
$$;

REVOKE ALL ON FUNCTION public.get_arena_analytics_bundle(uuid, timestamptz, timestamptz)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_arena_analytics_bundle(uuid, timestamptz, timestamptz)
  TO authenticated;

NOTIFY pgrst, 'reload schema';
