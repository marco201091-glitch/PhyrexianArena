-- Compact per-participant counters make exact per-deck medians possible without
-- retaining an unbounded raw event stream.
ALTER TABLE public.match_participants
  ADD COLUMN IF NOT EXISTS tracked_event_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS life_lost integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS life_gained integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS life_damage_dealt integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unattributed_life_lost integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commander_damage_taken integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commander_damage_dealt integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS infect_received integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS infect_dealt integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS eliminations integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS eliminations_caused integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revives integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS corrections integer NOT NULL DEFAULT 0;

ALTER TABLE public.match_participants
  DROP CONSTRAINT IF EXISTS match_participants_live_metrics_nonnegative,
  ADD CONSTRAINT match_participants_live_metrics_nonnegative CHECK (
    tracked_event_count >= 0
    AND life_lost >= 0
    AND life_gained >= 0
    AND life_damage_dealt >= 0
    AND unattributed_life_lost >= 0
    AND commander_damage_taken >= 0
    AND commander_damage_dealt >= 0
    AND infect_received >= 0
    AND infect_dealt >= 0
    AND eliminations >= 0
    AND eliminations_caused >= 0
    AND revives >= 0
    AND corrections >= 0
  );

CREATE OR REPLACE FUNCTION private.live_metric_int(p_metrics jsonb, p_key text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN pg_catalog.jsonb_typeof(p_metrics -> p_key) = 'number'
      THEN LEAST(
        2147483647::numeric,
        GREATEST(0::numeric, (p_metrics ->> p_key)::numeric)
      )::integer
    ELSE 0
  END;
$$;

REVOKE ALL ON FUNCTION private.live_metric_int(jsonb, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.sync_match_live_metrics()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_metrics jsonb;
BEGIN
  IF NEW.match_id IS NULL OR NEW.match_id IS NOT DISTINCT FROM OLD.match_id THEN
    RETURN NEW;
  END IF;

  v_metrics := NEW.state #> '{summary,byParticipant}';
  IF pg_catalog.jsonb_typeof(v_metrics) <> 'object' THEN
    RETURN NEW;
  END IF;

  UPDATE public.match_participants AS participant
  SET
    tracked_event_count = private.live_metric_int(metric.value, 'eventCount'),
    life_lost = private.live_metric_int(metric.value, 'lifeLost'),
    life_gained = private.live_metric_int(metric.value, 'lifeGained'),
    life_damage_dealt = private.live_metric_int(metric.value, 'lifeDamageDealt'),
    unattributed_life_lost = private.live_metric_int(metric.value, 'unattributedLifeLost'),
    commander_damage_taken = private.live_metric_int(metric.value, 'commanderDamageTaken'),
    commander_damage_dealt = private.live_metric_int(metric.value, 'commanderDamageDealt'),
    infect_received = private.live_metric_int(metric.value, 'infectReceived'),
    infect_dealt = private.live_metric_int(metric.value, 'infectDealt'),
    eliminations = private.live_metric_int(metric.value, 'eliminations'),
    eliminations_caused = private.live_metric_int(metric.value, 'eliminationsCaused'),
    revives = private.live_metric_int(metric.value, 'revives'),
    corrections = private.live_metric_int(metric.value, 'corrections')
  FROM pg_catalog.jsonb_each(v_metrics) AS metric(key, value)
  WHERE participant.match_id = NEW.match_id
    AND (
      (pg_catalog.split_part(metric.key, ':', 1) = 'user'
        AND participant.user_id::text = pg_catalog.split_part(metric.key, ':', 2))
      OR
      (pg_catalog.split_part(metric.key, ':', 1) = 'guest'
        AND participant.guest_id::text = pg_catalog.split_part(metric.key, ':', 2))
    );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.sync_match_live_metrics() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS live_games_sync_match_metrics ON public.live_games;
CREATE TRIGGER live_games_sync_match_metrics
  AFTER UPDATE OF match_id ON public.live_games
  FOR EACH ROW
  WHEN (NEW.match_id IS NOT NULL)
  EXECUTE FUNCTION private.sync_match_live_metrics();

COMMENT ON COLUMN public.match_participants.life_lost IS
  'Net tracked life lost during this live match; combine per-match rows for exact deck medians.';
