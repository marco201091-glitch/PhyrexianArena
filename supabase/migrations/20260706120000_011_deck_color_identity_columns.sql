/*
# Replace decks.card_list with dedicated columns

Stores only what the app needs:
- color_identity: commander color identity (W/U/B/R/G/C)
- commander_options: commander/partner metadata (name, art, per-commander colors)

Migrates compact metadata from legacy card_list, then drops the bloated column.
*/

ALTER TABLE decks ADD COLUMN IF NOT EXISTS color_identity text[] DEFAULT NULL;
ALTER TABLE decks ADD COLUMN IF NOT EXISTS commander_options jsonb DEFAULT NULL;

UPDATE decks
SET
  commander_options = CASE
    WHEN card_list IS NOT NULL
      AND jsonb_typeof(card_list) = 'object'
      AND card_list ? 'commanderOptions'
      AND jsonb_typeof(card_list->'commanderOptions') = 'array'
    THEN card_list->'commanderOptions'
    ELSE commander_options
  END,
  color_identity = CASE
    WHEN card_list IS NOT NULL
      AND jsonb_typeof(card_list) = 'object'
      AND card_list ? 'colorIdentity'
      AND jsonb_array_length(card_list->'colorIdentity') > 0
    THEN ARRAY(
      SELECT upper(jsonb_array_elements_text(card_list->'colorIdentity'))
    )
    ELSE color_identity
  END
WHERE card_list IS NOT NULL;

ALTER TABLE decks DROP COLUMN IF EXISTS card_list;