-- V2: live game sessions, match draws, arena stats helpers

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS is_draw boolean NOT NULL DEFAULT false;

ALTER TABLE matches
  DROP CONSTRAINT IF EXISTS matches_winner_draw_check;

ALTER TABLE matches
  ADD CONSTRAINT matches_winner_draw_check CHECK (
    (is_draw = true AND winner_id IS NULL AND winner_guest_id IS NULL)
    OR (is_draw = false)
  );

CREATE TABLE IF NOT EXISTS live_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'setup' CHECK (status IN ('setup', 'active', 'ended', 'cancelled')),
  starting_life integer NOT NULL DEFAULT 40 CHECK (starting_life >= 1 AND starting_life <= 999),
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  match_id uuid REFERENCES matches(id) ON DELETE SET NULL,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_games_group_status ON live_games(group_id, status);
CREATE INDEX IF NOT EXISTS idx_live_games_group_updated ON live_games(group_id, updated_at DESC);

CREATE OR REPLACE FUNCTION public.touch_live_game_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS live_games_touch_updated_at ON live_games;
CREATE TRIGGER live_games_touch_updated_at
  BEFORE UPDATE ON live_games
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_live_game_updated_at();

ALTER TABLE live_games ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "live_games_select_members" ON live_games;
CREATE POLICY "live_games_select_members" ON live_games
  FOR SELECT
  USING (
    public.is_admin(auth.uid())
    OR public.is_group_member(group_id, auth.uid())
  );

DROP POLICY IF EXISTS "live_games_insert_members" ON live_games;
CREATE POLICY "live_games_insert_members" ON live_games
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND public.is_group_member(group_id, auth.uid())
  );

DROP POLICY IF EXISTS "live_games_update_members" ON live_games;
CREATE POLICY "live_games_update_members" ON live_games
  FOR UPDATE
  USING (public.is_group_member(group_id, auth.uid()))
  WITH CHECK (public.is_group_member(group_id, auth.uid()));

DROP POLICY IF EXISTS "live_games_delete_creator" ON live_games;
CREATE POLICY "live_games_delete_creator" ON live_games
  FOR DELETE
  USING (
    created_by = auth.uid()
    OR public.is_admin(auth.uid())
  );

-- Lightweight stats rows for analytics tabs (independent of match list pagination)
CREATE OR REPLACE FUNCTION public.get_arena_stats_participants(
  p_group_id uuid,
  p_since timestamptz DEFAULT NULL
)
RETURNS TABLE (
  match_id uuid,
  played_at timestamptz,
  is_draw boolean,
  user_id uuid,
  guest_id uuid,
  deck_id uuid,
  guest_deck_id uuid,
  is_winner boolean,
  username text,
  display_name text,
  guest_display_name text,
  deck_commander text,
  deck_commander_image text,
  deck_bracket text,
  deck_color_identity text[],
  guest_deck_commander text,
  guest_deck_commander_image text,
  guest_deck_bracket text,
  guest_deck_color_identity text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.id AS match_id,
    m.played_at,
    m.is_draw,
    mp.user_id,
    mp.guest_id,
    mp.deck_id,
    mp.guest_deck_id,
    mp.is_winner,
    p.username,
    p.display_name,
    ag.display_name AS guest_display_name,
    d.commander AS deck_commander,
    d.commander_image AS deck_commander_image,
    d.bracket AS deck_bracket,
    d.color_identity AS deck_color_identity,
    agd.commander AS guest_deck_commander,
    agd.commander_image AS guest_deck_commander_image,
    agd.bracket AS guest_deck_bracket,
    agd.color_identity AS guest_deck_color_identity
  FROM matches m
  JOIN match_participants mp ON mp.match_id = m.id
  LEFT JOIN profiles p ON p.id = mp.user_id
  LEFT JOIN arena_guests ag ON ag.id = mp.guest_id
  LEFT JOIN decks d ON d.id = mp.deck_id
  LEFT JOIN arena_guest_decks agd ON agd.id = mp.guest_deck_id
  WHERE m.group_id = p_group_id
    AND (p_since IS NULL OR m.played_at >= p_since)
    AND (
      public.is_admin(auth.uid())
      OR public.is_group_member(p_group_id, auth.uid())
    )
  ORDER BY m.played_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_arena_stats_participants(uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_arena_stats_participants(uuid, timestamptz) TO authenticated;

-- Day summaries for lazy match history loading
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
  WITH arena_days AS (
    SELECT
      m.id,
      m.played_at,
      to_char(
        (m.played_at AT TIME ZONE 'UTC' - make_interval(hours => CASE
          WHEN EXTRACT(HOUR FROM m.played_at AT TIME ZONE 'UTC') < p_boundary_hour THEN 24
          ELSE 0
        END))::date,
        'YYYY-MM-DD'
      ) AS day_key
    FROM matches m
    WHERE m.group_id = p_group_id
      AND (
        public.is_admin(auth.uid())
        OR public.is_group_member(p_group_id, auth.uid())
      )
  )
  SELECT
    day_key,
    COUNT(*)::bigint AS match_count,
    MAX(played_at) AS latest_played_at
  FROM arena_days
  GROUP BY day_key
  ORDER BY day_key DESC;
$$;

REVOKE ALL ON FUNCTION public.get_arena_match_day_summaries(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_arena_match_day_summaries(uuid, integer) TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE live_games;