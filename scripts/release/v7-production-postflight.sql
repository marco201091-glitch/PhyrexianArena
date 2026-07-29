-- Read-only. Run after V7 migration and compare counts with preflight output.
SELECT
  count(*) AS matches,
  count(DISTINCT group_id) AS playgroups
FROM public.matches;

SELECT
  count(*) AS participant_rows,
  count(*) FILTER (WHERE deck_id IS NOT NULL) AS profile_deck_rows
FROM public.match_participants;

SELECT
  count(*) AS profiles,
  count(*) FILTER (WHERE avatar_revision IS NOT NULL) AS profiles_with_avatar
FROM public.profiles;

WITH expected AS (
  SELECT
    deck.id AS deck_id,
    count(participant.id)::integer AS games,
    count(participant.id) FILTER (WHERE participant.is_winner)::integer AS wins,
    (
      count(participant.id)
      + 2 * count(participant.id) FILTER (WHERE participant.is_winner)
    )::integer AS mastery_points
  FROM public.decks AS deck
  LEFT JOIN public.match_participants AS participant ON participant.deck_id = deck.id
  WHERE deck.group_id IS NULL
  GROUP BY deck.id
)
SELECT
  count(*) AS decks_checked,
  count(*) FILTER (WHERE mastery_points <> games + 2 * wins) AS mastery_mismatches,
  sum(games) AS total_deck_games,
  sum(wins) AS total_deck_wins
FROM expected;

SELECT
  jobname,
  schedule,
  active
FROM cron.job
WHERE jobname = 'v7-bounded-storage-maintenance';
