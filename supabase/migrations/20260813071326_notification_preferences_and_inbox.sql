-- Additive notification preferences and inbox controls for V8 clients.

begin;

create table public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  arena_invite boolean not null default true,
  arena_member_joined boolean not null default true,
  match_completed boolean not null default true,
  push_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

create policy notification_preferences_select_own
  on public.notification_preferences for select to authenticated
  using (user_id = (select auth.uid()));
create policy notification_preferences_insert_own
  on public.notification_preferences for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy notification_preferences_update_own
  on public.notification_preferences for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy app_notifications_update_own
  on public.app_notifications for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, insert, update on public.notification_preferences to authenticated;
grant update on public.app_notifications to authenticated;
grant all on public.notification_preferences to service_role;

-- Optimize the V8 notification policies without rewriting their historical migration.
drop policy if exists arena_invitations_select_participant on public.arena_invitations;
create policy arena_invitations_select_participant
  on public.arena_invitations for select to authenticated
  using (invited_user_id = (select auth.uid()) or invited_by = (select auth.uid()));

drop policy if exists app_notifications_select_own on public.app_notifications;
create policy app_notifications_select_own
  on public.app_notifications for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists push_tokens_select_own on public.push_tokens;
create policy push_tokens_select_own
  on public.push_tokens for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists push_tokens_insert_own on public.push_tokens;
create policy push_tokens_insert_own
  on public.push_tokens for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy if exists push_tokens_update_own on public.push_tokens;
create policy push_tokens_update_own
  on public.push_tokens for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
drop policy if exists push_tokens_delete_own on public.push_tokens;
create policy push_tokens_delete_own
  on public.push_tokens for delete to authenticated
  using (user_id = (select auth.uid()));

-- Preserve the existing member-joined behavior while honoring opt-outs.
create or replace function public.notify_arena_member_joined()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_group_name text;
  v_member_name text;
begin
  select name into v_group_name from public.groups where id = new.group_id;
  select coalesce(nullif(display_name, ''), username) into v_member_name
  from public.profiles where id = new.user_id;

  insert into public.app_notifications(user_id, type, title, body, data)
  select
    member.user_id,
    'arena_member_joined',
    'Nuovo membro nell''Arena',
    v_member_name || ' si è unito a ' || v_group_name,
    jsonb_build_object('groupId', new.group_id, 'memberId', new.user_id)
  from public.group_members as member
  left join public.notification_preferences as preference
    on preference.user_id = member.user_id
  where member.group_id = new.group_id
    and member.user_id <> new.user_id
    and coalesce(preference.arena_member_joined, true);

  return new;
end;
$$;

revoke all on function public.notify_arena_member_joined() from public, anon, authenticated;
grant execute on function public.notify_arena_member_joined() to service_role;

commit;
