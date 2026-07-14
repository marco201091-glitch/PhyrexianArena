-- Allow arena owners (and admins) to delete guests and their decks.

CREATE OR REPLACE FUNCTION public.is_group_owner(p_group_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.groups
    WHERE id = p_group_id
      AND created_by = p_user_id
  );
$$;

REVOKE ALL ON FUNCTION public.is_group_owner(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_group_owner(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "arena_guests_delete" ON arena_guests;
CREATE POLICY "arena_guests_delete" ON arena_guests FOR DELETE
  TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR public.is_group_owner(group_id, auth.uid())
  );

DROP POLICY IF EXISTS "arena_guest_decks_delete" ON arena_guest_decks;
CREATE POLICY "arena_guest_decks_delete" ON arena_guest_decks FOR DELETE
  TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR public.is_group_owner(group_id, auth.uid())
  );