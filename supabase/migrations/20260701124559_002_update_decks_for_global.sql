/*
# Update decks table for global decks

This migration updates the decks table to support:
1. Global decks (not tied to a specific group) - makes group_id nullable
2. Adds updated_at timestamp for tracking modifications
3. Ensures backward compatibility with existing decks

Changes:
- ALTER decks.group_id to be nullable (allows global decks)
- ADD updated_at column with auto-update trigger
- DROP existing constraints that require group_id
- RECREATE RLS policies to allow users to read/write their own global decks
*/

-- Make group_id nullable to allow global decks
ALTER TABLE decks ALTER COLUMN group_id DROP NOT NULL;

-- Add updated_at column
ALTER TABLE decks ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create trigger function for auto-updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for decks table
DROP TRIGGER IF EXISTS update_decks_updated_at ON decks;
CREATE TRIGGER update_decks_updated_at
  BEFORE UPDATE ON decks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update RLS policies to allow users to manage their own global decks
DROP POLICY IF EXISTS "decks_select" ON decks;
CREATE POLICY "decks_select" ON decks FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM group_members gm1
      JOIN group_members gm2 ON gm1.group_id = gm2.group_id
      WHERE gm1.user_id = auth.uid()
        AND gm2.user_id = decks.user_id
    )
  );

DROP POLICY IF EXISTS "decks_insert" ON decks;
CREATE POLICY "decks_insert" ON decks FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "decks_update" ON decks;
CREATE POLICY "decks_update" ON decks FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "decks_delete" ON decks;
CREATE POLICY "decks_delete" ON decks FOR DELETE
  TO authenticated USING (user_id = auth.uid());