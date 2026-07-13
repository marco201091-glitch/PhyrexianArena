/*
# Rename commander_image_url to commander_image

For consistency with the requirements, rename the column.
*/

ALTER TABLE decks RENAME COLUMN commander_image_url TO commander_image;