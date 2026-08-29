-- Store the semantic app version on app-origin access logs and expose it only
-- through the existing administrator-only history RPC.

ALTER TABLE public.access_logs
  ADD COLUMN IF NOT EXISTS app_version text;

ALTER TABLE public.access_logs
  DROP CONSTRAINT IF EXISTS access_logs_app_version_check;

ALTER TABLE public.access_logs
  ADD CONSTRAINT access_logs_app_version_check CHECK (
    app_version IS NULL
    OR (
      pg_catalog.char_length(app_version) <= 32
      AND app_version ~ '^[0-9]+\.[0-9]+\.[0-9]+([+-][0-9A-Za-z.-]+)?$'
    )
  );

DROP FUNCTION IF EXISTS public.record_user_access(uuid);
DROP FUNCTION IF EXISTS public.record_user_access(uuid, text);

CREATE FUNCTION public.record_user_access(
  p_user_id uuid,
  p_source text DEFAULT 'web',
  p_app_version text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_username text;
  recent_exists boolean;
  normalized_source text;
  normalized_app_version text;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN pg_catalog.jsonb_build_object('recorded', false, 'reason', 'missing_user');
  END IF;

  normalized_source := CASE
    WHEN pg_catalog.lower(pg_catalog.btrim(COALESCE(p_source, ''::text))) = 'app' THEN 'app'
    ELSE 'web'
  END;
  normalized_app_version := CASE
    WHEN normalized_source = 'app'
      AND COALESCE(p_app_version, ''::text) ~ '^[0-9]+\.[0-9]+\.[0-9]+([+-][0-9A-Za-z.-]+)?$'
      THEN p_app_version
    ELSE NULL
  END;

  SELECT pg_catalog.lower(p.username)
  INTO user_username
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE u.id = p_user_id;

  IF NOT FOUND THEN
    RETURN pg_catalog.jsonb_build_object('recorded', false, 'reason', 'user_not_found');
  END IF;

  IF user_username IN ('usertest', 'administrator') THEN
    RETURN pg_catalog.jsonb_build_object('recorded', false, 'reason', 'excluded_account');
  END IF;

  IF public.is_admin(p_user_id) THEN
    RETURN pg_catalog.jsonb_build_object('recorded', false, 'reason', 'excluded_admin');
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.access_logs
    WHERE user_id = p_user_id
      AND source = normalized_source
      AND accessed_at > pg_catalog.now() - interval '1 hour'
  ) INTO recent_exists;

  IF recent_exists THEN
    RETURN pg_catalog.jsonb_build_object('recorded', false, 'reason', 'deduplicated');
  END IF;

  INSERT INTO public.access_logs (user_id, source, app_version, accessed_at)
  VALUES (p_user_id, normalized_source, normalized_app_version, pg_catalog.now());

  RETURN pg_catalog.jsonb_build_object(
    'recorded', true,
    'source', normalized_source,
    'appVersion', normalized_app_version
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_user_access(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_user_access(uuid, text, text) TO service_role;

DROP FUNCTION IF EXISTS public.list_access_logs_for_admin(integer, timestamptz, timestamptz);

CREATE FUNCTION public.list_access_logs_for_admin(
  p_limit integer DEFAULT 100,
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  username text,
  source text,
  app_version text,
  accessed_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'permission denied for function list_access_logs_for_admin'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    al.id,
    COALESCE(p.username, 'unknown'::text) AS username,
    al.source,
    CASE WHEN al.source = 'app' THEN al.app_version ELSE NULL END AS app_version,
    al.accessed_at
  FROM public.access_logs al
  LEFT JOIN public.profiles p ON p.id = al.user_id
  WHERE (p_from IS NULL OR al.accessed_at >= p_from)
    AND (p_to IS NULL OR al.accessed_at <= p_to)
  ORDER BY al.accessed_at DESC
  LIMIT pg_catalog.least(pg_catalog.greatest(COALESCE(p_limit, 100), 1), 500);
END;
$$;

REVOKE ALL ON FUNCTION public.list_access_logs_for_admin(integer, timestamptz, timestamptz)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_access_logs_for_admin(integer, timestamptz, timestamptz)
  TO authenticated;
