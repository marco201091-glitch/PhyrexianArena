-- GitHub #27: per-user Archidekt import preferences.
-- Applied only to supabase-test during V6 development.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS archidekt_username text,
  ADD COLUMN IF NOT EXISTS archidekt_auto_import boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archidekt_last_sync_at timestamptz;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_archidekt_username_format
  CHECK (
    archidekt_username IS NULL
    OR (
      archidekt_username = btrim(archidekt_username)
      AND char_length(archidekt_username) BETWEEN 1 AND 80
    )
  ) NOT VALID;

COMMENT ON COLUMN public.profiles.archidekt_username IS
  'Public Archidekt username selected by the account owner.';
COMMENT ON COLUMN public.profiles.archidekt_auto_import IS
  'When enabled, profile open checks public Archidekt decks and imports unseen source URLs.';
