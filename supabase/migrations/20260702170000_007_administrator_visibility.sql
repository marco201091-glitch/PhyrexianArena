-- Give the administrator account full visibility and management access.

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
    FROM public.profiles
    WHERE id = p_user_id
      AND lower(username) = 'administrator'
  ) INTO admin_exists;

  RETURN admin_exists;
END;
$$;

REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "groups_select" ON groups;
CREATE POLICY "groups_select" ON groups FOR SELECT
  TO authenticated USING (
    true
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "groups_update" ON groups;
CREATE POLICY "groups_update" ON groups FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (created_by = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "groups_delete" ON groups;
CREATE POLICY "groups_delete" ON groups FOR DELETE
  TO authenticated USING (created_by = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "group_members_select" ON group_members;
CREATE POLICY "group_members_select" ON group_members FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR public.is_group_member(group_id, auth.uid())
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "group_members_insert" ON group_members;
CREATE POLICY "group_members_insert" ON group_members FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "group_members_delete" ON group_members;
CREATE POLICY "group_members_delete" ON group_members FOR DELETE
  TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "decks_select" ON decks;
CREATE POLICY "decks_select" ON decks FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR public.is_admin(auth.uid())
    OR (
      group_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM group_members
        WHERE group_members.group_id = decks.group_id
        AND group_members.user_id = auth.uid()
      )
    )
    OR EXISTS (
      SELECT 1
      FROM public.group_members gm1
      JOIN public.group_members gm2 ON gm1.group_id = gm2.group_id
      WHERE gm1.user_id = auth.uid()
        AND gm2.user_id = decks.user_id
    )
  );

DROP POLICY IF EXISTS "decks_insert" ON decks;
CREATE POLICY "decks_insert" ON decks FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "decks_update" ON decks;
CREATE POLICY "decks_update" ON decks FOR UPDATE
  TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "decks_delete" ON decks;
CREATE POLICY "decks_delete" ON decks FOR DELETE
  TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "matches_select" ON matches;
CREATE POLICY "matches_select" ON matches FOR SELECT
  TO authenticated USING (
    public.is_group_member(group_id, auth.uid())
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "matches_insert" ON matches;
CREATE POLICY "matches_insert" ON matches FOR INSERT
  TO authenticated WITH CHECK (
    (public.is_group_member(group_id, auth.uid()) AND created_by = auth.uid())
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "matches_update" ON matches;
CREATE POLICY "matches_update" ON matches FOR UPDATE
  TO authenticated
  USING (public.is_group_member(group_id, auth.uid()) OR public.is_admin(auth.uid()))
  WITH CHECK (public.is_group_member(group_id, auth.uid()) OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "matches_delete" ON matches;
CREATE POLICY "matches_delete" ON matches FOR DELETE
  TO authenticated USING (created_by = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "match_participants_select" ON match_participants;
CREATE POLICY "match_participants_select" ON match_participants FOR SELECT
  TO authenticated USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM matches
      JOIN group_members ON group_members.group_id = matches.group_id
      WHERE matches.id = match_participants.match_id
      AND group_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "match_participants_insert" ON match_participants;
CREATE POLICY "match_participants_insert" ON match_participants FOR INSERT
  TO authenticated WITH CHECK (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM matches
      JOIN group_members ON group_members.group_id = matches.group_id
      WHERE matches.id = match_participants.match_id
      AND group_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "match_participants_update" ON match_participants;
CREATE POLICY "match_participants_update" ON match_participants FOR UPDATE
  TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM matches
      JOIN group_members ON group_members.group_id = matches.group_id
      WHERE matches.id = match_participants.match_id
      AND group_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM matches
      JOIN group_members ON group_members.group_id = matches.group_id
      WHERE matches.id = match_participants.match_id
      AND group_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "match_participants_delete" ON match_participants;
CREATE POLICY "match_participants_delete" ON match_participants FOR DELETE
  TO authenticated USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = match_participants.match_id
      AND matches.created_by = auth.uid()
    )
  );
