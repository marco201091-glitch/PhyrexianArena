begin;

alter table public.push_tokens
  add column if not exists locale text not null default 'it'
  check (locale in ('it', 'en'));

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
  select coalesce(nullif(display_name, ''), username, 'Un giocatore') into v_member_name
  from public.profiles where id = new.user_id;

  insert into public.app_notifications(user_id, type, title, body, data)
  select
    member.user_id,
    'arena_member_joined',
    'Nuovo membro nell''Arena',
    v_member_name || ' si è unito a ' || v_group_name,
    jsonb_build_object(
      'groupId', new.group_id,
      'memberId', new.user_id,
      'title_it', 'Nuovo membro nell''Arena',
      'body_it', v_member_name || ' si è unito a ' || v_group_name,
      'title_en', 'New Arena member',
      'body_en', v_member_name || ' joined ' || v_group_name
    )
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
