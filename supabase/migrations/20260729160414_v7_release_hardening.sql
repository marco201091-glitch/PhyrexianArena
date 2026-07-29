-- V7 release hardening: scalable profile mastery plus non-listable avatars.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_revision timestamptz;

UPDATE public.profiles AS profile
SET avatar_revision = avatar.latest_revision
FROM (
  SELECT
    pg_catalog.split_part(object.name, '/', 1) AS user_id,
    max(COALESCE(object.updated_at, object.created_at)) AS latest_revision
  FROM storage.objects AS object
  WHERE object.bucket_id = 'avatars'
    AND pg_catalog.split_part(object.name, '/', 2) LIKE 'avatar%'
  GROUP BY pg_catalog.split_part(object.name, '/', 1)
) AS avatar
WHERE profile.id::text = avatar.user_id
  AND profile.avatar_revision IS DISTINCT FROM avatar.latest_revision;

COMMENT ON COLUMN public.profiles.avatar_revision IS
  'Last successful avatar upload. Avoids listing a public Storage bucket.';

-- Public URLs serve avatar bytes without SELECT. Storage upsert still needs
-- authenticated metadata reads, restricted to the caller's deterministic path.
DROP POLICY IF EXISTS "avatars_select" ON storage.objects;
CREATE POLICY "avatars_select_metadata_for_upsert"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND storage.allow_any_operation(
      ARRAY['object.get_authenticated_info', 'object.get_authenticated']
    )
    AND (
      (storage.foldername(name))[1] = (SELECT auth.uid())::text
      OR public.is_admin((SELECT auth.uid()))
    )
  );

CREATE INDEX IF NOT EXISTS idx_match_participants_deck_match
  ON public.match_participants(deck_id, match_id)
  WHERE deck_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.get_profile_deck_performance(
  p_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  deck_id uuid,
  games_played integer,
  wins integer,
  mastery_points integer,
  tracked_games integer,
  second_places integer,
  damage_dealt bigint,
  damage_taken bigint,
  life_gained bigint,
  commander_damage bigint,
  infect_dealt bigint,
  eliminations bigint,
  median_winning_duration_seconds integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH authorized_user AS (
    SELECT COALESCE(p_user_id, (SELECT auth.uid())) AS id
  )
  SELECT
    deck.id AS deck_id,
    count(participant.id)::integer AS games_played,
    count(participant.id) FILTER (WHERE participant.is_winner)::integer AS wins,
    (
      count(participant.id)
      + 2 * count(participant.id) FILTER (WHERE participant.is_winner)
    )::integer AS mastery_points,
    count(participant.id) FILTER (
      WHERE match.tracking_version IS NOT NULL
        OR match.duration_seconds IS NOT NULL
    )::integer AS tracked_games,
    count(participant.id) FILTER (WHERE participant.placement = 2)::integer AS second_places,
    COALESCE(sum(participant.life_damage_dealt) FILTER (
      WHERE match.tracking_version IS NOT NULL
        OR match.duration_seconds IS NOT NULL
    ), 0)::bigint AS damage_dealt,
    COALESCE(sum(participant.life_lost) FILTER (
      WHERE match.tracking_version IS NOT NULL
        OR match.duration_seconds IS NOT NULL
    ), 0)::bigint AS damage_taken,
    COALESCE(sum(participant.life_gained) FILTER (
      WHERE match.tracking_version IS NOT NULL
        OR match.duration_seconds IS NOT NULL
    ), 0)::bigint AS life_gained,
    COALESCE(sum(participant.commander_damage_dealt) FILTER (
      WHERE match.tracking_version IS NOT NULL
        OR match.duration_seconds IS NOT NULL
    ), 0)::bigint AS commander_damage,
    COALESCE(sum(participant.infect_dealt) FILTER (
      WHERE match.tracking_version IS NOT NULL
        OR match.duration_seconds IS NOT NULL
    ), 0)::bigint AS infect_dealt,
    COALESCE(sum(participant.eliminations_caused) FILTER (
      WHERE match.tracking_version IS NOT NULL
        OR match.duration_seconds IS NOT NULL
    ), 0)::bigint AS eliminations,
    round(
      percentile_cont(0.5) WITHIN GROUP (ORDER BY match.duration_seconds)
      FILTER (
        WHERE participant.is_winner
          AND match.duration_seconds IS NOT NULL
      )
    )::integer AS median_winning_duration_seconds
  FROM authorized_user
  JOIN public.decks AS deck
    ON deck.user_id = authorized_user.id
   AND deck.group_id IS NULL
  LEFT JOIN public.match_participants AS participant
    ON participant.deck_id = deck.id
  LEFT JOIN public.matches AS match
    ON match.id = participant.match_id
  WHERE authorized_user.id = (SELECT auth.uid())
    OR public.is_admin((SELECT auth.uid()))
  GROUP BY deck.id;
$$;

REVOKE ALL ON FUNCTION public.get_profile_deck_performance(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_profile_deck_performance(uuid)
  TO authenticated;

COMMENT ON FUNCTION public.get_profile_deck_performance(uuid) IS
  'All-time deck rollup. Mastery is derived as 1 point per game plus 2 extra per win, so V6 history is backfilled automatically without mutable counters.';

NOTIFY pgrst, 'reload schema';
