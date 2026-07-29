DO $$
DECLARE
  legacy_relation_count integer;
  legacy_function_count integer;
BEGIN
  SELECT count(*) INTO legacy_relation_count
  FROM pg_catalog.pg_class AS relation
  JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname IN (
      'arena_guest_claim_links',
      'live_game_lobbies',
      'live_game_lobby_guests',
      'public_counter_guests',
      'public_counter_sessions'
    );

  IF legacy_relation_count <> 0 THEN
    RAISE EXCEPTION 'Remote guest relations still present: %', legacy_relation_count;
  END IF;

  SELECT count(*) INTO legacy_function_count
  FROM pg_catalog.pg_proc AS procedure
  JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = procedure.pronamespace
  WHERE namespace.nspname = 'public'
    AND procedure.proname IN (
      'apply_guest_live_game_state',
      'claim_arena_guest',
      'purge_finished_guest_sessions'
    );

  IF legacy_function_count <> 0 THEN
    RAISE EXCEPTION 'Remote guest functions still present: %', legacy_function_count;
  END IF;
END;
$$;
