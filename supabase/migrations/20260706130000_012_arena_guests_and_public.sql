-- Arena guests, guest decks, public arena profiles, guest match participants

ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS arena_guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  normalized_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_played_at timestamptz,
  UNIQUE (group_id, normalized_name)
);

CREATE INDEX IF NOT EXISTS idx_arena_guests_group ON arena_guests(group_id);

CREATE TABLE IF NOT EXISTS arena_guest_decks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id uuid NOT NULL REFERENCES arena_guests(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name text NOT NULL,
  commander text NOT NULL,
  commander_image text,
  color_identity text[] DEFAULT '{}',
  commander_options jsonb DEFAULT '[]'::jsonb,
  bracket text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_arena_guest_decks_guest ON arena_guest_decks(guest_id);
CREATE INDEX IF NOT EXISTS idx_arena_guest_decks_group ON arena_guest_decks(group_id);

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS winner_guest_id uuid REFERENCES arena_guests(id) ON DELETE SET NULL;

ALTER TABLE match_participants
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE match_participants
  ADD COLUMN IF NOT EXISTS guest_id uuid REFERENCES arena_guests(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS guest_deck_id uuid REFERENCES arena_guest_decks(id) ON DELETE SET NULL;

ALTER TABLE match_participants
  DROP CONSTRAINT IF EXISTS match_participants_match_id_user_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_match_participants_match_user
  ON match_participants(match_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_match_participants_match_guest
  ON match_participants(match_id, guest_id)
  WHERE guest_id IS NOT NULL;

ALTER TABLE match_participants
  DROP CONSTRAINT IF EXISTS match_participants_identity_check;

ALTER TABLE match_participants
  ADD CONSTRAINT match_participants_identity_check CHECK (
    (user_id IS NOT NULL AND guest_id IS NULL)
    OR (user_id IS NULL AND guest_id IS NOT NULL)
  );

ALTER TABLE arena_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_guest_decks ENABLE ROW LEVEL SECURITY;

-- Public arena read access (aggregate stats only via same member policies + public group flag)
DROP POLICY IF EXISTS "groups_public_select" ON groups;
CREATE POLICY "groups_public_select" ON groups FOR SELECT
  USING (
    is_public = true
    OR created_by = auth.uid()
    OR public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups.id
      AND group_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "arena_guests_select" ON arena_guests;
CREATE POLICY "arena_guests_select" ON arena_guests FOR SELECT
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = arena_guests.group_id
      AND group_members.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = arena_guests.group_id
      AND groups.is_public = true
    )
  );

DROP POLICY IF EXISTS "arena_guests_insert" ON arena_guests;
CREATE POLICY "arena_guests_insert" ON arena_guests FOR INSERT
  WITH CHECK (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = arena_guests.group_id
      AND group_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "arena_guests_update" ON arena_guests;
CREATE POLICY "arena_guests_update" ON arena_guests FOR UPDATE
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = arena_guests.group_id
      AND group_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = arena_guests.group_id
      AND group_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "arena_guest_decks_select" ON arena_guest_decks;
CREATE POLICY "arena_guest_decks_select" ON arena_guest_decks FOR SELECT
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = arena_guest_decks.group_id
      AND group_members.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = arena_guest_decks.group_id
      AND groups.is_public = true
    )
  );

DROP POLICY IF EXISTS "arena_guest_decks_insert" ON arena_guest_decks;
CREATE POLICY "arena_guest_decks_insert" ON arena_guest_decks FOR INSERT
  WITH CHECK (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = arena_guest_decks.group_id
      AND group_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "arena_guest_decks_update" ON arena_guest_decks;
CREATE POLICY "arena_guest_decks_update" ON arena_guest_decks FOR UPDATE
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = arena_guest_decks.group_id
      AND group_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = arena_guest_decks.group_id
      AND group_members.user_id = auth.uid()
    )
  );

-- Allow public read of matches/participants for public arenas
DROP POLICY IF EXISTS "matches_public_select" ON matches;
CREATE POLICY "matches_public_select" ON matches FOR SELECT
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = matches.group_id
      AND group_members.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = matches.group_id
      AND groups.is_public = true
    )
  );

DROP POLICY IF EXISTS "match_participants_public_select" ON match_participants;
CREATE POLICY "match_participants_public_select" ON match_participants FOR SELECT
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM matches
      JOIN group_members ON group_members.group_id = matches.group_id
      WHERE matches.id = match_participants.match_id
      AND group_members.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM matches
      JOIN groups ON groups.id = matches.group_id
      WHERE matches.id = match_participants.match_id
      AND groups.is_public = true
    )
  );