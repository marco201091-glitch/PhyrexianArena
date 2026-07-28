CREATE TABLE public.arena_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  invited_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  CHECK (invited_user_id <> invited_by)
);

CREATE UNIQUE INDEX arena_invitations_one_pending_idx
  ON public.arena_invitations(group_id, invited_user_id)
  WHERE status = 'pending';
CREATE INDEX arena_invitations_recipient_idx
  ON public.arena_invitations(invited_user_id, created_at DESC);

CREATE TABLE public.app_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('arena_invite', 'arena_member_joined', 'match_completed')),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  dedupe_key text UNIQUE,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX app_notifications_user_created_idx
  ON public.app_notifications(user_id, created_at DESC);
CREATE INDEX app_notifications_unread_idx
  ON public.app_notifications(user_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE TABLE public.push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  expo_push_token text NOT NULL UNIQUE CHECK (expo_push_token ~ '^(ExponentPushToken|ExpoPushToken)[[][A-Za-z0-9_-]+[]]$'),
  platform text NOT NULL CHECK (platform IN ('android', 'ios')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX push_tokens_user_idx ON public.push_tokens(user_id);

ALTER TABLE public.arena_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY arena_invitations_select_participant
  ON public.arena_invitations FOR SELECT TO authenticated
  USING (invited_user_id = auth.uid() OR invited_by = auth.uid());

CREATE POLICY app_notifications_select_own
  ON public.app_notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY push_tokens_select_own
  ON public.push_tokens FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY push_tokens_insert_own
  ON public.push_tokens FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY push_tokens_update_own
  ON public.push_tokens FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY push_tokens_delete_own
  ON public.push_tokens FOR DELETE TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT ON public.arena_invitations TO authenticated;
GRANT SELECT ON public.app_notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_tokens TO authenticated;
GRANT ALL ON public.arena_invitations, public.app_notifications, public.push_tokens TO service_role;

CREATE OR REPLACE FUNCTION public.notify_arena_member_joined()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_group_name text;
  v_member_name text;
BEGIN
  SELECT name INTO v_group_name FROM public.groups WHERE id = NEW.group_id;
  SELECT COALESCE(NULLIF(display_name, ''), username) INTO v_member_name
  FROM public.profiles WHERE id = NEW.user_id;

  INSERT INTO public.app_notifications(user_id, type, title, body, data)
  SELECT
    member.user_id,
    'arena_member_joined',
    'Nuovo membro nell''Arena',
    v_member_name || ' si è unito a ' || v_group_name,
    jsonb_build_object('groupId', NEW.group_id, 'memberId', NEW.user_id)
  FROM public.group_members AS member
  WHERE member.group_id = NEW.group_id
    AND member.user_id <> NEW.user_id;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_arena_member_joined() FROM PUBLIC;

CREATE TRIGGER group_members_notify_joined
AFTER INSERT ON public.group_members
FOR EACH ROW EXECUTE FUNCTION public.notify_arena_member_joined();

ALTER PUBLICATION supabase_realtime ADD TABLE public.app_notifications;
