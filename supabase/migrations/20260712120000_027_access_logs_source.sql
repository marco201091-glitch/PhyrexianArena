-- Distinguish web and app access logs; deduplicate per user per source per hour.

ALTER TABLE public.access_logs
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'web';

ALTER TABLE public.access_logs
  DROP CONSTRAINT IF EXISTS access_logs_source_check;

ALTER TABLE public.access_logs
  ADD CONSTRAINT access_logs_source_check CHECK (source IN ('web', 'app'));

CREATE INDEX IF NOT EXISTS access_logs_user_source_accessed_at_idx
  ON public.access_logs (user_id, source, accessed_at DESC);

CREATE OR REPLACE FUNCTION public.record_user_access(
  p_user_id uuid,
  p_source text DEFAULT 'web'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  user_username text;
  recent_exists boolean;
  normalized_source text;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('recorded', false, 'reason', 'missing_user');
  END IF;

  normalized_source := CASE
    WHEN lower(trim(COALESCE(p_source, ''))) = 'app' THEN 'app'
    ELSE 'web'
  END;

  SELECT lower(p.username)
  INTO user_username
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE u.id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('recorded', false, 'reason', 'user_not_found');
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
      AND source = normalized_source
      AND accessed_at > now() - interval '1 hour'
  ) INTO recent_exists;

  IF recent_exists THEN
    RETURN jsonb_build_object('recorded', false, 'reason', 'deduplicated');
  END IF;

  INSERT INTO public.access_logs (user_id, source, accessed_at)
  VALUES (p_user_id, normalized_source, now());

  RETURN jsonb_build_object('recorded', true, 'source', normalized_source);
END;
$$;

DROP FUNCTION IF EXISTS public.list_access_logs_for_admin(integer, timestamptz, timestamptz);

CREATE OR REPLACE FUNCTION public.list_access_logs_for_admin(
  p_limit integer DEFAULT 100,
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  username text,
  source text,
  accessed_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'permission denied for function list_access_logs_for_admin'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    al.id,
    COALESCE(p.username, 'unknown') AS username,
    al.source,
    al.accessed_at
  FROM public.access_logs al
  LEFT JOIN public.profiles p ON p.id = al.user_id
  WHERE (p_from IS NULL OR al.accessed_at >= p_from)
    AND (p_to IS NULL OR al.accessed_at <= p_to)
  ORDER BY al.accessed_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 500);
END;
$$;

REVOKE ALL ON FUNCTION public.record_user_access(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_user_access(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_user_access(uuid, text) TO service_role;

REVOKE ALL ON FUNCTION public.list_access_logs_for_admin(integer, timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_access_logs_for_admin(integer, timestamptz, timestamptz) TO authenticated;