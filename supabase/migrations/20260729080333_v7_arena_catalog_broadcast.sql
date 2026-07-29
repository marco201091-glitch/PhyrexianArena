CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.send_arena_catalog_event(
  p_group_id uuid,
  p_entity text,
  p_operation text,
  p_entity_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM realtime.send(
    jsonb_build_object(
      'entity', p_entity,
      'operation', p_operation,
      'id', p_entity_id
    ),
    'catalog_changed',
    'arena:' || p_group_id::text || ':catalog',
    true
  );
END;
$$;

REVOKE ALL ON FUNCTION private.send_arena_catalog_event(uuid, text, text, uuid)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.broadcast_member_deck_catalog()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_row public.decks%ROWTYPE;
  v_group_id uuid;
BEGIN
  v_row := CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;

  FOR v_group_id IN
    SELECT membership.group_id
    FROM public.group_members AS membership
    WHERE membership.user_id = v_row.user_id
  LOOP
    PERFORM private.send_arena_catalog_event(v_group_id, 'deck', TG_OP, v_row.id);
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE ALL ON FUNCTION private.broadcast_member_deck_catalog()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS broadcast_member_deck_catalog_trigger ON public.decks;
CREATE TRIGGER broadcast_member_deck_catalog_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.decks
  FOR EACH ROW
  EXECUTE FUNCTION private.broadcast_member_deck_catalog();

CREATE OR REPLACE FUNCTION private.broadcast_group_catalog_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_entity text;
  v_group_id uuid;
  v_entity_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_group_id := OLD.group_id;
    v_entity_id := OLD.id;
  ELSE
    v_group_id := NEW.group_id;
    v_entity_id := NEW.id;
  END IF;
  v_entity := CASE TG_TABLE_NAME
    WHEN 'group_members' THEN 'member'
    WHEN 'arena_guests' THEN 'guest'
    ELSE 'guest_deck'
  END;

  PERFORM private.send_arena_catalog_event(v_group_id, v_entity, TG_OP, v_entity_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE ALL ON FUNCTION private.broadcast_group_catalog_row()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS broadcast_group_member_catalog_trigger ON public.group_members;
CREATE TRIGGER broadcast_group_member_catalog_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.group_members
  FOR EACH ROW
  EXECUTE FUNCTION private.broadcast_group_catalog_row();

DROP TRIGGER IF EXISTS broadcast_arena_guest_catalog_trigger ON public.arena_guests;
CREATE TRIGGER broadcast_arena_guest_catalog_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.arena_guests
  FOR EACH ROW
  EXECUTE FUNCTION private.broadcast_group_catalog_row();

DROP TRIGGER IF EXISTS broadcast_arena_guest_deck_catalog_trigger ON public.arena_guest_decks;
CREATE TRIGGER broadcast_arena_guest_deck_catalog_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.arena_guest_decks
  FOR EACH ROW
  EXECUTE FUNCTION private.broadcast_group_catalog_row();

DROP POLICY IF EXISTS "arena_catalog_broadcast_select" ON realtime.messages;
CREATE POLICY "arena_catalog_broadcast_select"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    CASE
      WHEN realtime.topic() ~ '^arena:[0-9a-fA-F-]{36}:catalog$'
      THEN public.is_group_member(
        split_part(realtime.topic(), ':', 2)::uuid,
        (SELECT auth.uid())
      )
      ELSE false
    END
  );
