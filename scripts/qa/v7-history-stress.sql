-- Dev-only destructive-in-transaction stress test. Every synthetic row rolls back.
BEGIN;

CREATE TEMP TABLE v7_stress_base ON COMMIT DROP AS
SELECT
  match.group_id,
  match.created_by,
  participant.user_id,
  participant.deck_id
FROM public.matches AS match
JOIN public.match_participants AS participant ON participant.match_id = match.id
WHERE participant.user_id IS NOT NULL
  AND participant.deck_id IS NOT NULL
LIMIT 1;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM v7_stress_base) THEN
    RAISE EXCEPTION 'Stress test needs one existing profile-deck match in Dev';
  END IF;
END;
$$;

CREATE TEMP TABLE v7_stress_match_ids (
  id uuid PRIMARY KEY,
  sequence integer NOT NULL
) ON COMMIT DROP;

INSERT INTO v7_stress_match_ids(id, sequence)
SELECT gen_random_uuid(), series
FROM generate_series(1, 10000) AS series;

INSERT INTO public.matches(
  id,
  group_id,
  created_by,
  played_at,
  is_draw,
  live_game_log
)
SELECT
  generated.id,
  base.group_id,
  base.created_by,
  now() - pg_catalog.make_interval(secs => generated.sequence),
  false,
  '[]'::jsonb
FROM v7_stress_match_ids AS generated
CROSS JOIN v7_stress_base AS base;

INSERT INTO public.match_participants(
  match_id,
  user_id,
  deck_id,
  is_winner
)
SELECT
  generated.id,
  base.user_id,
  base.deck_id,
  generated.sequence % 4 = 0
FROM v7_stress_match_ids AS generated
CROSS JOIN v7_stress_base AS base;

DO $$
DECLARE
  base_row v7_stress_base%ROWTYPE;
  started_at timestamptz;
  elapsed_ms numeric;
  page_ms numeric;
  mastery_ms numeric;
  fetched integer;
  mastery record;
BEGIN
  SELECT * INTO STRICT base_row FROM v7_stress_base;
  PERFORM set_config('request.jwt.claim.sub', base_row.user_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  started_at := clock_timestamp();
  SELECT count(*) INTO fetched
  FROM (
    SELECT match.id
    FROM public.matches AS match
    WHERE match.group_id = base_row.group_id
    ORDER BY match.played_at DESC, match.id DESC
    LIMIT 101
  ) AS page;
  elapsed_ms := extract(epoch FROM clock_timestamp() - started_at) * 1000;
  page_ms := elapsed_ms;
  IF fetched <> 101 OR elapsed_ms > 1000 THEN
    RAISE EXCEPTION 'History page failed: rows=%, elapsed_ms=%', fetched, elapsed_ms;
  END IF;

  started_at := clock_timestamp();
  SELECT * INTO mastery
  FROM public.get_profile_deck_performance(base_row.user_id)
  WHERE deck_id = base_row.deck_id;
  elapsed_ms := extract(epoch FROM clock_timestamp() - started_at) * 1000;
  mastery_ms := elapsed_ms;
  IF mastery.mastery_points <> mastery.games_played + 2 * mastery.wins THEN
    RAISE EXCEPTION 'Mastery invariant failed';
  END IF;
  IF elapsed_ms > 2000 THEN
    RAISE EXCEPTION 'Mastery rollup too slow: elapsed_ms=%', elapsed_ms;
  END IF;

  RAISE NOTICE
    'V7 stress OK: 10000 synthetic matches; page=% ms; mastery=% ms',
    round(page_ms, 2),
    round(mastery_ms, 2);
END;
$$;

ROLLBACK;
