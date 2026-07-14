-- Fix infinite recursion in RLS policies (42P17 on group_members)
-- Cause: migration 012 used inline subqueries on group_members inside other table policies.
-- Fix: use SECURITY DEFINER helpers with row_security disabled.

CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members
    WHERE group_id = p_group_id
      AND user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.users_share_group(p_user_a uuid, p_user_b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members gm1
    INNER JOIN public.group_members gm2 ON gm1.group_id = gm2.group_id
    WHERE gm1.user_id = p_user_a
      AND gm2.user_id = p_user_b
  );
$$;

REVOKE ALL ON FUNCTION public.is_group_member(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.users_share_group(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.users_share_group(uuid, uuid) TO authenticated;

-- group_members: keep membership visibility without inline self-joins in other policies
DROP POLICY IF EXISTS "group_members_select" ON group_members;
CREATE POLICY "group_members_select" ON group_members FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR public.is_admin(auth.uid())
    OR public.is_group_member(group_id, auth.uid())
  );

-- groups: restore open read for authenticated; public read for anon
DROP POLICY IF EXISTS "groups_select" ON groups;
DROP POLICY IF EXISTS "groups_public_select" ON groups;

CREATE POLICY "groups_select" ON groups FOR SELECT
  TO authenticated
  USING (true OR public.is_admin(auth.uid()));

CREATE POLICY "groups_anon_public_select" ON groups FOR SELECT
  TO anon
  USING (is_public = true);

-- decks: remove inline group_members subqueries
DROP POLICY IF EXISTS "decks_select" ON decks;
CREATE POLICY "decks_select" ON decks FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR public.is_admin(auth.uid())
    OR (group_id IS NOT NULL AND public.is_group_member(group_id, auth.uid()))
    OR public.users_share_group(auth.uid(), decks.user_id)
  );

-- matches
DROP POLICY IF EXISTS "matches_select" ON matches;
DROP POLICY IF EXISTS "matches_public_select" ON matches;

CREATE POLICY "matches_select" ON matches FOR SELECT
  USING (
    public.is_admin(auth.uid())
    OR public.is_group_member(group_id, auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.groups g
      WHERE g.id = matches.group_id
        AND g.is_public = true
    )
  );

-- match_participants (fix dashboard personal analytics + public arenas)
DROP POLICY IF EXISTS "match_participants_select" ON match_participants;
DROP POLICY IF EXISTS "match_participants_public_select" ON match_participants;

CREATE POLICY "match_participants_select" ON match_participants FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_admin(auth.uid())
    OR public.is_group_member(
      (SELECT m.group_id FROM public.matches m WHERE m.id = match_participants.match_id LIMIT 1),
      auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.matches m
      JOIN public.groups g ON g.id = m.group_id
      WHERE m.id = match_participants.match_id
        AND g.is_public = true
    )
  );

DROP POLICY IF EXISTS "match_participants_insert" ON match_participants;
CREATE POLICY "match_participants_insert" ON match_participants FOR INSERT
  TO authenticated WITH CHECK (
    public.is_admin(auth.uid())
    OR public.is_group_member(
      (SELECT m.group_id FROM public.matches m WHERE m.id = match_participants.match_id LIMIT 1),
      auth.uid()
    )
  );

DROP POLICY IF EXISTS "match_participants_update" ON match_participants;
CREATE POLICY "match_participants_update" ON match_participants FOR UPDATE
  TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR public.is_group_member(
      (SELECT m.group_id FROM public.matches m WHERE m.id = match_participants.match_id LIMIT 1),
      auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR public.is_group_member(
      (SELECT m.group_id FROM public.matches m WHERE m.id = match_participants.match_id LIMIT 1),
      auth.uid()
    )
  );

-- arena guests / guest decks
DROP POLICY IF EXISTS "arena_guests_select" ON arena_guests;
CREATE POLICY "arena_guests_select" ON arena_guests FOR SELECT
  USING (
    public.is_admin(auth.uid())
    OR public.is_group_member(group_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = arena_guests.group_id
        AND g.is_public = true
    )
  );

DROP POLICY IF EXISTS "arena_guests_insert" ON arena_guests;
CREATE POLICY "arena_guests_insert" ON arena_guests FOR INSERT
  WITH CHECK (
    public.is_admin(auth.uid())
    OR public.is_group_member(group_id, auth.uid())
  );

DROP POLICY IF EXISTS "arena_guests_update" ON arena_guests;
CREATE POLICY "arena_guests_update" ON arena_guests FOR UPDATE
  USING (
    public.is_admin(auth.uid())
    OR public.is_group_member(group_id, auth.uid())
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR public.is_group_member(group_id, auth.uid())
  );

DROP POLICY IF EXISTS "arena_guest_decks_select" ON arena_guest_decks;
CREATE POLICY "arena_guest_decks_select" ON arena_guest_decks FOR SELECT
  USING (
    public.is_admin(auth.uid())
    OR public.is_group_member(group_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = arena_guest_decks.group_id
        AND g.is_public = true
    )
  );

DROP POLICY IF EXISTS "arena_guest_decks_insert" ON arena_guest_decks;
CREATE POLICY "arena_guest_decks_insert" ON arena_guest_decks FOR INSERT
  WITH CHECK (
    public.is_admin(auth.uid())
    OR public.is_group_member(group_id, auth.uid())
  );

DROP POLICY IF EXISTS "arena_guest_decks_update" ON arena_guest_decks;
CREATE POLICY "arena_guest_decks_update" ON arena_guest_decks FOR UPDATE
  USING (
    public.is_admin(auth.uid())
    OR public.is_group_member(group_id, auth.uid())
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR public.is_group_member(group_id, auth.uid())
  );