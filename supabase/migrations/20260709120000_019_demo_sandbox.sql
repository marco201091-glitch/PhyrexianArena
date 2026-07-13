-- Demo sandbox: flag demo users and prevent cross-contamination with real arenas.

CREATE OR REPLACE FUNCTION public.is_demo_user()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_demo')::boolean, false);
$$;

REVOKE ALL ON FUNCTION public.is_demo_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_demo_user() TO authenticated;

DROP POLICY IF EXISTS "group_members_insert" ON group_members;

CREATE POLICY "group_members_insert" ON group_members FOR INSERT
  TO authenticated
  WITH CHECK (
    (user_id = auth.uid() OR public.is_admin(auth.uid()))
    AND (
      NOT public.is_demo_user()
      OR EXISTS (
        SELECT 1
        FROM public.groups g
        WHERE g.id = group_members.group_id
          AND g.created_by = auth.uid()
      )
    )
  );

CREATE OR REPLACE FUNCTION public.get_group_by_invite_code(p_invite_code text)
RETURNS TABLE (
  id uuid,
  name text,
  description text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT g.id, g.name, g.description
  FROM public.groups g
  WHERE upper(trim(g.invite_code)) = upper(trim(p_invite_code))
    AND NOT public.is_demo_user()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_group_by_invite_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_group_by_invite_code(text) TO anon, authenticated;