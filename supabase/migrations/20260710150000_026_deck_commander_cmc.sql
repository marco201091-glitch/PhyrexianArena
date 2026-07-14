-- Persist average commander CMC per deck (partners averaged), like bracket and colors.

ALTER TABLE decks ADD COLUMN IF NOT EXISTS commander_cmc numeric;
ALTER TABLE arena_guest_decks ADD COLUMN IF NOT EXISTS commander_cmc numeric;