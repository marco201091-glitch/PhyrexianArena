DO $$
DECLARE
  enabled_trigger_count integer;
  policy_count integer;
BEGIN
  SELECT count(*) INTO enabled_trigger_count
  FROM pg_catalog.pg_trigger AS trigger
  JOIN pg_catalog.pg_class AS relation ON relation.oid = trigger.tgrelid
  JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND trigger.tgname IN (
      'broadcast_member_deck_catalog_trigger',
      'broadcast_group_member_catalog_trigger',
      'broadcast_arena_guest_catalog_trigger',
      'broadcast_arena_guest_deck_catalog_trigger'
    )
    AND trigger.tgenabled <> 'D';

  IF enabled_trigger_count <> 4 THEN
    RAISE EXCEPTION 'Expected 4 enabled catalog triggers, found %', enabled_trigger_count;
  END IF;

  SELECT count(*) INTO policy_count
  FROM pg_catalog.pg_policies
  WHERE schemaname = 'realtime'
    AND tablename = 'messages'
    AND policyname = 'arena_catalog_broadcast_select'
    AND roles @> ARRAY['authenticated'::name];

  IF policy_count <> 1 THEN
    RAISE EXCEPTION 'Private catalog broadcast policy missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_proc AS procedure
    JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = procedure.pronamespace
    WHERE namespace.nspname = 'private'
      AND procedure.proname = 'send_arena_catalog_event'
      AND procedure.prosecdef
  ) THEN
    RAISE EXCEPTION 'Catalog broadcast function missing or not hardened';
  END IF;
END;
$$;
