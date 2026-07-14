-- Arena membership management: creators and platform admins can remove members.

DROP POLICY IF EXISTS "group_members_delete" ON group_members;

CREATE POLICY "group_members_delete" ON group_members FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.groups g
      WHERE g.id = group_members.group_id
        AND g.created_by = auth.uid()
        AND group_members.user_id <> auth.uid()
    )
  );