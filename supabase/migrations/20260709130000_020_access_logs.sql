-- Access logs: track authenticated visits with 1h deduplication and 30-day retention.

CREATE TABLE IF NOT EXISTS public.access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  accessed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS access_logs_user_accessed_at_idx
  ON public.access_logs (user_id, accessed_at DESC);

CREATE INDEX IF NOT EXISTS access_logs_accessed_at_idx
  ON public.access_logs (accessed_at);

ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.access_logs FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_user_access(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  user_email text;
  user_username text;
  is_demo boolean;
  recent_exists boolean;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('recorded', false, 'reason', 'missing_user');
  END IF;

  SELECT
    lower(u.email),
    lower(p.username),
    COALESCE((u.raw_app_meta_data ->> 'is_demo')::boolean, false)
  INTO user_email, user_username, is_demo
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE u.id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('recorded', false, 'reason', 'user_not_found');
  END IF;

  IF is_demo THEN
    RETURN jsonb_build_object('recorded', false, 'reason', 'excluded_demo');
  END IF;

  IF user_username IN ('usertest', 'administrator') THEN
    RETURN jsonb_build_object('recorded', false, 'reason', 'excluded_account');
  END IF;

  IF public.is_admin(p_user_id) THEN
    RETURN jsonb_build_object('recorded', false, 'reason', 'excluded_admin');
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.access_logs
    WHERE user_id = p_user_id
      AND accessed_at > now() - interval '1 hour'
  ) INTO recent_exists;

  IF recent_exists THEN
    RETURN jsonb_build_object('recorded', false, 'reason', 'deduplicated');
  END IF;

  INSERT INTO public.access_logs (user_id, accessed_at)
  VALUES (p_user_id, now());

  RETURN jsonb_build_object('recorded', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.purge_old_access_logs(p_retention_days integer DEFAULT 30)
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

  DELETE FROM public.access_logs
  WHERE accessed_at < now() - make_interval(days => p_retention_days);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.record_user_access(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_user_access(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.purge_old_access_logs(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_old_access_logs(integer) TO service_role;