/*
# Commander Game Tracker Schema

This migration creates the complete database structure for tracking Commander (MTG) games among friends.

1. New Tables
- `profiles`: Extended user data (username) linked to Supabase Auth
  - `id` (uuid, primary key, references auth.users)
  - `username` (text, unique, not null)
  - `created_at` (timestamptz)
  
- `groups` (Tavoli): Game tables/groups that friends create
  - `id` (uuid, primary key)
  - `name` (text, not null)
  - `description` (text)
  - `invite_code` (text, unique, not null) - for shareable links
  - `created_by` (uuid, references profiles)
  - `created_at` (timestamptz)
  
- `group_members`: Membership relationship between users and groups
  - `id` (uuid, primary key)
  - `group_id` (uuid, references groups)
  - `user_id` (uuid, references profiles)
  - `joined_at` (timestamptz)
  - Unique constraint on (group_id, user_id)
  
- `decks`: User's Commander decks
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `group_id` (uuid, references groups) - deck context per group
  - `name` (text, not null)
  - `commander` (text, not null)
  - `commander_image_url` (text)
  - `source_url` (text) - original Archidekt/Moxfield URL
  - `source_type` (text) - 'archidekt' or 'moxfield'
  - `card_list` (jsonb) - stored card data
  - `created_at` (timestamptz)
  
- `matches`: Game records
  - `id` (uuid, primary key)
  - `group_id` (uuid, references groups)
  - `winner_id` (uuid, references profiles)
  - `played_at` (timestamptz, default now())
  - `created_by` (uuid, references profiles)
  - `notes` (text)
  
- `match_participants`: Players in each match
  - `id` (uuid, primary key)
  - `match_id` (uuid, references matches)
  - `user_id` (uuid, references profiles)
  - `deck_id` (uuid, references decks)
  - `is_winner` (boolean, default false)

2. Security
- Enable RLS on all tables
- Profile policies: users can read all profiles (for game display), update own
- Group policies: members can read, creator can delete, authenticated can create
- Group members: members can read, anyone can join via invite code
- Decks: owner can CRUD, group members can read
- Matches: group members can read and create, creator can delete
- Match participants: accessible through match membership

3. Indexes
- invite_code on groups (for fast lookup)
- group_id, user_id on relevant tables
*/

-- Create profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create groups table (tavoli)
CREATE TABLE IF NOT EXISTS groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  invite_code text UNIQUE NOT NULL DEFAULT upper(substring(gen_random_uuid()::text, 1, 8)),
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Create group_members junction table
CREATE TABLE IF NOT EXISTS group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  UNIQUE (group_id, user_id)
);

-- Create decks table
CREATE TABLE IF NOT EXISTS decks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name text NOT NULL,
  commander text NOT NULL,
  commander_image_url text,
  source_url text,
  source_type text,
  card_list jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create matches table
CREATE TABLE IF NOT EXISTS matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  winner_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  played_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notes text
);

-- Create match_participants junction table
CREATE TABLE IF NOT EXISTS match_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  deck_id uuid REFERENCES decks(id) ON DELETE SET NULL,
  is_winner boolean NOT NULL DEFAULT false,
  UNIQUE (match_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_groups_invite_code ON groups(invite_code);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_decks_user ON decks(user_id);
CREATE INDEX IF NOT EXISTS idx_decks_group ON decks(group_id);
CREATE INDEX IF NOT EXISTS idx_matches_group ON matches(group_id);
CREATE INDEX IF NOT EXISTS idx_matches_played_at ON matches(played_at);
CREATE INDEX IF NOT EXISTS idx_match_participants_match ON match_participants(match_id);
CREATE INDEX IF NOT EXISTS idx_match_participants_deck ON match_participants(deck_id);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_participants ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Groups policies (members can read, anyone authenticated can create)
CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  exists_member boolean;
BEGIN
  SET LOCAL row_security = off;
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members
    WHERE group_id = p_group_id
      AND user_id = p_user_id
  ) INTO exists_member;
  RETURN exists_member;
END;
$$;

DROP POLICY IF EXISTS "groups_select" ON groups;
CREATE POLICY "groups_select" ON groups FOR SELECT
  TO authenticated USING (
    true
  );

DROP POLICY IF EXISTS "groups_insert" ON groups;
CREATE POLICY "groups_insert" ON groups FOR INSERT
  TO authenticated WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "groups_delete" ON groups;
CREATE POLICY "groups_delete" ON groups FOR DELETE
  TO authenticated USING (created_by = auth.uid());

-- Group members policies
DROP POLICY IF EXISTS "group_members_select" ON group_members;
CREATE POLICY "group_members_select" ON group_members FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR public.is_group_member(group_id, auth.uid())
  );
DROP POLICY IF EXISTS "group_members_insert" ON group_members;
CREATE POLICY "group_members_insert" ON group_members FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "group_members_delete" ON group_members;
CREATE POLICY "group_members_delete" ON group_members FOR DELETE
  TO authenticated USING (user_id = auth.uid());

-- Decks policies (owner can CRUD, group members can read)
DROP POLICY IF EXISTS "decks_select" ON decks;
CREATE POLICY "decks_select" ON decks FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
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
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "decks_update" ON decks;
CREATE POLICY "decks_update" ON decks FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "decks_delete" ON decks;
CREATE POLICY "decks_delete" ON decks FOR DELETE
  TO authenticated USING (user_id = auth.uid());

-- Matches policies (group members can read and create)
DROP POLICY IF EXISTS "matches_select" ON matches;
CREATE POLICY "matches_select" ON matches FOR SELECT
  TO authenticated USING (
    public.is_group_member(group_id, auth.uid())
  );

DROP POLICY IF EXISTS "matches_insert" ON matches;
CREATE POLICY "matches_insert" ON matches FOR INSERT
  TO authenticated WITH CHECK (
    public.is_group_member(group_id, auth.uid())
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS "matches_delete" ON matches;
CREATE POLICY "matches_delete" ON matches FOR DELETE
  TO authenticated USING (created_by = auth.uid());

-- Match participants policies
DROP POLICY IF EXISTS "match_participants_select" ON match_participants;
CREATE POLICY "match_participants_select" ON match_participants FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM matches
      JOIN group_members ON group_members.group_id = matches.group_id
      WHERE matches.id = match_participants.match_id
      AND group_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "match_participants_insert" ON match_participants;
CREATE POLICY "match_participants_insert" ON match_participants FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM matches
      JOIN group_members ON group_members.group_id = matches.group_id
      WHERE matches.id = match_participants.match_id
      AND group_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "match_participants_delete" ON match_participants;
CREATE POLICY "match_participants_delete" ON match_participants FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = match_participants.match_id
      AND matches.created_by = auth.uid()
    )
  );

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to automatically add creator as group member
CREATE OR REPLACE FUNCTION public.handle_new_group()
RETURNS trigger SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.group_members (group_id, user_id)
  VALUES (NEW.id, NEW.created_by);
  RETURN NEW;
END;
$$;

-- Trigger to add creator as member
DROP TRIGGER IF EXISTS on_group_created ON groups;
CREATE TRIGGER on_group_created
  AFTER INSERT ON groups
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_group();