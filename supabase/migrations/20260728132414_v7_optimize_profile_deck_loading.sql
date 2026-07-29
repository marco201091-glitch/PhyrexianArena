-- Profile deck lists always filter personal decks and sort newest first.
CREATE INDEX IF NOT EXISTS idx_decks_personal_user_created
  ON public.decks (user_id, created_at DESC)
  WHERE group_id IS NULL;
