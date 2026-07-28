CREATE UNIQUE INDEX decks_user_archidekt_source_unique_idx
  ON public.decks(user_id, source_url)
  WHERE group_id IS NULL
    AND source_type = 'archidekt'
    AND source_url IS NOT NULL;

CREATE OR REPLACE FUNCTION public.sync_archidekt_decks(p_decks jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_item jsonb;
  v_source_url text;
  v_existing_id uuid;
  v_inserted integer := 0;
  v_updated integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(p_decks) <> 'array' OR jsonb_array_length(p_decks) > 80 THEN
    RAISE EXCEPTION 'Invalid Archidekt sync payload' USING ERRCODE = '22023';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_decks)
  LOOP
    v_source_url := NULLIF(trim(v_item->>'source_url'), '');
    IF v_source_url IS NULL
      OR v_source_url !~ '^https://archidekt[.]com/decks/[0-9]+/?$'
      OR NULLIF(trim(v_item->>'name'), '') IS NULL
      OR NULLIF(trim(v_item->>'commander'), '') IS NULL
    THEN
      RAISE EXCEPTION 'Invalid Archidekt deck' USING ERRCODE = '22023';
    END IF;

    SELECT id INTO v_existing_id
    FROM public.decks
    WHERE user_id = v_user_id
      AND group_id IS NULL
      AND source_type = 'archidekt'
      AND source_url = v_source_url
    FOR UPDATE;

    IF v_existing_id IS NULL THEN
      INSERT INTO public.decks(
        user_id, group_id, name, commander, commander_image,
        source_url, source_type, bracket, color_identity,
        commander_options, commander_cmc
      ) VALUES (
        v_user_id,
        NULL,
        left(trim(v_item->>'name'), 160),
        left(trim(v_item->>'commander'), 240),
        NULLIF(left(v_item->>'commander_image', 500), ''),
        v_source_url,
        'archidekt',
        NULLIF(left(v_item->>'bracket', 20), ''),
        CASE WHEN jsonb_typeof(v_item->'color_identity') = 'array'
          THEN ARRAY(SELECT jsonb_array_elements_text(v_item->'color_identity'))
          ELSE NULL END,
        CASE WHEN jsonb_typeof(v_item->'commander_options') = 'array'
          THEN v_item->'commander_options'
          ELSE NULL END,
        CASE WHEN (v_item->>'commander_cmc') ~ '^[0-9]+([.][0-9]+)?$'
          THEN (v_item->>'commander_cmc')::numeric
          ELSE NULL END
      );
      v_inserted := v_inserted + 1;
    ELSE
      UPDATE public.decks
      SET
        name = left(trim(v_item->>'name'), 160),
        commander = left(trim(v_item->>'commander'), 240),
        commander_image = COALESCE(NULLIF(left(v_item->>'commander_image', 500), ''), commander_image),
        bracket = NULLIF(left(v_item->>'bracket', 20), ''),
        color_identity = CASE WHEN jsonb_typeof(v_item->'color_identity') = 'array'
          THEN ARRAY(SELECT jsonb_array_elements_text(v_item->'color_identity'))
          ELSE color_identity END,
        commander_options = CASE WHEN jsonb_typeof(v_item->'commander_options') = 'array'
          THEN v_item->'commander_options'
          ELSE commander_options END,
        commander_cmc = CASE WHEN (v_item->>'commander_cmc') ~ '^[0-9]+([.][0-9]+)?$'
          THEN (v_item->>'commander_cmc')::numeric
          ELSE commander_cmc END,
        updated_at = now()
      WHERE id = v_existing_id;
      v_updated := v_updated + 1;
    END IF;
  END LOOP;

  UPDATE public.profiles
  SET archidekt_last_sync_at = now()
  WHERE id = v_user_id;

  RETURN jsonb_build_object('inserted', v_inserted, 'updated', v_updated);
END;
$$;

REVOKE ALL ON FUNCTION public.sync_archidekt_decks(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_archidekt_decks(jsonb) TO authenticated;
