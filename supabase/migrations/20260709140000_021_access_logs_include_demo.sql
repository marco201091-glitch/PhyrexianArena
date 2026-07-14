-- Include demo account visits in access logs.

CREATE OR REPLACE FUNCTION public.record_user_access(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  user_username text;
  recent_exists boolean;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('recorded', false, 'reason', 'missing_user');
  END IF;

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

REVOKE ALL ON FUNCTION public.record_user_access(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_user_access(uuid) TO service_role;