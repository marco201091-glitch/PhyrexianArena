-- Security hardening: platform admin by email, join-by-code RPC, tighter groups RLS, private deck notes.

CREATE TABLE IF NOT EXISTS public.platform_admin_emails (
  email text PRIMARY KEY CHECK (email = lower(email)),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_admin_emails ENABLE ROW LEVEL SECURITY;

-- Only the DB owner / service role manages this table.
REVOKE ALL ON public.platform_admin_emails FROM anon, authenticated;

-- Seed admins from the legacy username-based administrator account, if present.
INSERT INTO public.platform_admin_emails (email)
SELECT lower(u.email)
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
WHERE lower(p.username) = 'administrator'
  AND u.email IS NOT NULL
ON CONFLICT (email) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_admin(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_exists boolean;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  SET LOCAL row_security = off;

  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = p_user_id
      AND lower(u.email) IN (
        SELECT email FROM public.platform_admin_emails
      )
  ) INTO admin_exists;

  RETURN admin_exists;
END;
$$;

REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

-- Lookup arena by invite code without exposing every private arena row.
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
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_group_by_invite_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_group_by_invite_code(text) TO anon, authenticated;

DROP POLICY IF EXISTS "groups_select" ON public.groups;

CREATE POLICY "groups_select" ON public.groups FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_group_member(id, auth.uid())
    OR public.is_admin(auth.uid())
    OR is_public = true
  );

-- Drop legacy profile_notes column if it exists (feature removed in app).
ALTER TABLE public.decks DROP COLUMN IF EXISTS profile_notes;

-- Clean up deck_private_notes if a previous partial migration created it.
DROP TABLE IF EXISTS public.deck_private_notes;