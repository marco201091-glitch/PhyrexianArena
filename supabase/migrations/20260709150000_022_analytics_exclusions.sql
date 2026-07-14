-- Exclude admin, usertest, and demo users from platform-wide admin analytics.

CREATE OR REPLACE FUNCTION public.get_analytics_excluded_user_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT u.id
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE COALESCE((u.raw_app_meta_data ->> 'is_demo')::boolean, false)
    OR lower(COALESCE(p.username, '')) IN ('usertest', 'administrator', 'demo')
    OR public.is_admin(u.id);
$$;

REVOKE ALL ON FUNCTION public.get_analytics_excluded_user_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_analytics_excluded_user_ids() TO service_role;