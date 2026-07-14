-- Allow edit flows and store imported Commander bracket metadata.

ALTER TABLE decks
  ADD COLUMN IF NOT EXISTS bracket text;

DROP POLICY IF EXISTS "groups_update" ON groups;
CREATE POLICY "groups_update" ON groups FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "matches_update" ON matches;
CREATE POLICY "matches_update" ON matches FOR UPDATE
  TO authenticated
  USING (public.is_group_member(group_id, auth.uid()))
  WITH CHECK (
    public.is_group_member(group_id, auth.uid())
  );

DROP POLICY IF EXISTS "match_participants_update" ON match_participants;
CREATE POLICY "match_participants_update" ON match_participants FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM matches
      JOIN group_members ON group_members.group_id = matches.group_id
      WHERE matches.id = match_participants.match_id
      AND group_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM matches
      JOIN group_members ON group_members.group_id = matches.group_id
      WHERE matches.id = match_participants.match_id
      AND group_members.user_id = auth.uid()
    )
  );
