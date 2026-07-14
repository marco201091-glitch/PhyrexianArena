-- Allow platform admins to read access logs via authenticated RPC (no service role required).

GRANT SELECT ON TABLE public.access_logs TO service_role;

CREATE OR REPLACE FUNCTION public.list_access_logs_for_admin(
  p_limit integer DEFAULT 100,
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  username text,
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
    al.accessed_at
  FROM public.access_logs al
  LEFT JOIN public.profiles p ON p.id = al.user_id
  WHERE (p_from IS NULL OR al.accessed_at >= p_from)
    AND (p_to IS NULL OR al.accessed_at <= p_to)
  ORDER BY al.accessed_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 500);
END;
$$;

REVOKE ALL ON FUNCTION public.list_access_logs_for_admin(integer, timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_access_logs_for_admin(integer, timestamptz, timestamptz) TO authenticated;