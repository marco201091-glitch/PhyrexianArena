-- Read-only. Run against the target database before V7 migration.
SELECT
  count(*) AS matches,
  count(DISTINCT group_id) AS playgroups,
  min(played_at) AS oldest_match,
  max(played_at) AS newest_match
FROM public.matches;

SELECT
  count(*) AS participant_rows,
  count(*) FILTER (WHERE deck_id IS NOT NULL) AS profile_deck_rows,
  count(*) FILTER (WHERE guest_deck_id IS NOT NULL) AS guest_deck_rows,
  count(*) FILTER (WHERE user_id IS NULL AND guest_id IS NULL) AS missing_identity_rows,
  count(*) FILTER (WHERE deck_id IS NULL AND guest_deck_id IS NULL) AS missing_deck_rows
FROM public.match_participants;

SELECT match_id, user_id, guest_id, count(*) AS duplicate_rows
FROM public.match_participants
GROUP BY match_id, user_id, guest_id
HAVING count(*) > 1;

SELECT
  deck.id AS deck_id,
  deck.user_id,
  count(participant.id)::integer AS games,
  count(participant.id) FILTER (WHERE participant.is_winner)::integer AS wins,
  (
    count(participant.id)
    + 2 * count(participant.id) FILTER (WHERE participant.is_winner)
  )::integer AS expected_mastery_points
FROM public.decks AS deck
LEFT JOIN public.match_participants AS participant ON participant.deck_id = deck.id
WHERE deck.group_id IS NULL
GROUP BY deck.id, deck.user_id
ORDER BY expected_mastery_points DESC, deck.id;
