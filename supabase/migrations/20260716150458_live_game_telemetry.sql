-- Aggregated client-session health metrics. One bounded row per user/session;
-- no gameplay payloads or raw events are stored here.
CREATE TABLE public.live_game_telemetry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  live_game_id uuid REFERENCES public.live_games(id) ON DELETE SET NULL,
  session_id uuid NOT NULL,
  client_platform text NOT NULL CHECK (client_platform IN ('web', 'expo')),
  mutation_syncs integer NOT NULL DEFAULT 0 CHECK (mutation_syncs >= 0),
  version_conflicts integer NOT NULL DEFAULT 0 CHECK (version_conflicts >= 0),
  failed_syncs integer NOT NULL DEFAULT 0 CHECK (failed_syncs >= 0),
  max_queue_depth integer NOT NULL DEFAULT 0 CHECK (max_queue_depth >= 0),
  slowest_sync_ms integer NOT NULL DEFAULT 0 CHECK (slowest_sync_ms >= 0),
  last_error text CHECK (last_error IS NULL OR char_length(last_error) <= 300),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, session_id)
);

CREATE INDEX live_game_telemetry_user_updated_idx
  ON public.live_game_telemetry(user_id, updated_at DESC);

ALTER TABLE public.live_game_telemetry ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.live_game_telemetry FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.live_game_telemetry TO authenticated;

CREATE POLICY "live_game_telemetry_select_own"
  ON public.live_game_telemetry
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "live_game_telemetry_insert_own"
  ON public.live_game_telemetry
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "live_game_telemetry_update_own"
  ON public.live_game_telemetry
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

COMMENT ON TABLE public.live_game_telemetry IS
  'Aggregated realtime sync health per authenticated client session; excludes gameplay payloads.';

CREATE FUNCTION public.purge_old_live_game_telemetry(p_retention_days integer DEFAULT 30)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  IF p_retention_days IS NULL OR p_retention_days <= 0 THEN
    RETURN 0;
  END IF;

  DELETE FROM public.live_game_telemetry
  WHERE updated_at < now() - make_interval(days => p_retention_days);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_old_live_game_telemetry(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_old_live_game_telemetry(integer) TO service_role;
