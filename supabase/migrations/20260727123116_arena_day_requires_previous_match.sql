-- A 00:00–07:59 UTC match belongs to the previous arena day only when that
-- calendar day already contains a recorded match. Isolated late-night games
-- remain on their own calendar day.
CREATE OR REPLACE FUNCTION public.get_arena_match_day_summaries(
  p_group_id uuid,
  p_boundary_hour integer DEFAULT 8
)
RETURNS TABLE (
  day_key text,
  match_count bigint,
  latest_played_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH authorized_matches AS (
    SELECT
      m.id,
      m.played_at,
      (m.played_at AT TIME ZONE 'UTC')::date AS calendar_day
    FROM matches m
    WHERE m.group_id = p_group_id
      AND (
        public.is_admin(auth.uid())
        OR public.is_group_member(p_group_id, auth.uid())
      )
  ), arena_days AS (
    SELECT
      current_match.id,
      current_match.played_at,
      to_char(
        CASE
          WHEN EXTRACT(HOUR FROM current_match.played_at AT TIME ZONE 'UTC') < p_boundary_hour
            AND EXISTS (
              SELECT 1
              FROM authorized_matches previous_match
              WHERE previous_match.calendar_day = current_match.calendar_day - 1
            )
            THEN current_match.calendar_day - 1
          ELSE current_match.calendar_day
        END,
        'YYYY-MM-DD'
      ) AS day_key
    FROM authorized_matches current_match
  )
  SELECT
    day_key,
    COUNT(*)::bigint AS match_count,
    MAX(played_at) AS latest_played_at
  FROM arena_days
  GROUP BY day_key
  ORDER BY day_key DESC;
$$;

REVOKE ALL ON FUNCTION public.get_arena_match_day_summaries(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_arena_match_day_summaries(uuid, integer) TO authenticated;
