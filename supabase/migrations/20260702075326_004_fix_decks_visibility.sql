/*
# Fix RLS policy for global decks visibility

This allows users to view decks owned by users who share any group with them.
*/

-- Drop the existing select policy
DROP POLICY IF EXISTS "decks_select" ON decks;

-- Create a new policy that allows:
-- 1. Users to see their own decks (including global ones)
-- 2. Users to see decks from any group they're a member of
-- 3. Users to see global decks owned by users in their groups
CREATE POLICY "decks_select" ON decks FOR SELECT
  TO authenticated USING (
    -- Own decks
    user_id = auth.uid()
    OR
    -- Decks in groups the user is a member of
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = decks.group_id
      AND group_members.user_id = auth.uid()
    )
    OR
    -- Global decks owned by users who share any group with the current user
    (decks.group_id IS NULL AND EXISTS (
      SELECT 1 FROM group_members gm1
      JOIN group_members gm2 ON gm1.group_id = gm2.group_id
      WHERE gm1.user_id = auth.uid()
      AND gm2.user_id = decks.user_id
    ))
  );