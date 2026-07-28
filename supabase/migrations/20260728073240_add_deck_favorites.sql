ALTER TABLE public.decks
  ADD COLUMN IF NOT EXISTS is_favorite boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS decks_user_favorite_updated_idx
  ON public.decks(user_id, is_favorite DESC, updated_at DESC)
  WHERE group_id IS NULL;

COMMENT ON COLUMN public.decks.is_favorite IS
  'User-controlled pin for personal deck ordering; it does not alter the external source.';
