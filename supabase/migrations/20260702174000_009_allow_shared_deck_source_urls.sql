-- Allow different users to save the same external deck URL.
-- Older/manual schemas may have a global unique constraint or index on decks.source_url.

DO $$
DECLARE
  constraint_record record;
  index_record record;
BEGIN
  FOR constraint_record IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.decks'::regclass
      AND contype = 'u'
      AND conkey = ARRAY[
        (
          SELECT attnum
          FROM pg_attribute
          WHERE attrelid = 'public.decks'::regclass
            AND attname = 'source_url'
        )
      ]::smallint[]
  LOOP
    EXECUTE format('ALTER TABLE public.decks DROP CONSTRAINT IF EXISTS %I', constraint_record.conname);
  END LOOP;

  FOR index_record IN
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'decks'
      AND indexdef ILIKE 'CREATE UNIQUE INDEX%'
      AND indexdef ILIKE '%source_url%'
      AND indexdef NOT ILIKE '%user_id%'
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS public.%I', index_record.indexname);
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_decks_source_url ON public.decks(source_url)
  WHERE source_url IS NOT NULL;
