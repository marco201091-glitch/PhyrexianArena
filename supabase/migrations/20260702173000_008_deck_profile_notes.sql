-- Store private per-profile notes on saved decks.
ALTER TABLE decks
  ADD COLUMN IF NOT EXISTS profile_notes text;
