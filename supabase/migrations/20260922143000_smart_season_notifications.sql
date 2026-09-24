begin;

alter table public.notification_preferences
  add column if not exists season_completed boolean not null default true;

alter table public.app_notifications
  drop constraint if exists app_notifications_type_check;

alter table public.app_notifications
  add constraint app_notifications_type_check
  check (type in ('arena_invite', 'arena_member_joined', 'match_completed', 'season_completed'));

create or replace function public.notify_arena_season_completed()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_group_name text;
  v_period_it text;
  v_period_en text;
begin
  select name into v_group_name from public.groups where id = new.group_id;
  v_period_it := to_char(new.season_start, 'DD/MM/YYYY') || ' – ' || to_char(new.season_end - 1, 'DD/MM/YYYY');
  v_period_en := to_char(new.season_start, 'Mon DD, YYYY') || ' – ' || to_char(new.season_end - 1, 'Mon DD, YYYY');

  insert into public.app_notifications (user_id, type, title, body, data, dedupe_key)
  select
    member.user_id,
    'season_completed',
    'Stagione conclusa · ' || coalesce(v_group_name, 'Playgroup'),
    'La stagione ' || v_period_it || ' è pronta da rivedere.',
    jsonb_build_object(
      'groupId', new.group_id,
      'seasonStart', new.season_start,
      'seasonEnd', new.season_end,
      'title_it', 'Stagione conclusa · ' || coalesce(v_group_name, 'Playgroup'),
      'body_it', 'La stagione ' || v_period_it || ' è pronta da rivedere.',
      'title_en', 'Season completed · ' || coalesce(v_group_name, 'Playgroup'),
      'body_en', 'The ' || v_period_en || ' season is ready to review.'
    ),
    'season_completed:' || new.group_id || ':' || new.season_start || ':' || member.user_id
  from public.group_members as member
  left join public.notification_preferences as preference on preference.user_id = member.user_id
  where member.group_id = new.group_id
    and coalesce(preference.season_completed, true)
  on conflict (dedupe_key) do nothing;

  return new;
end;
$$;

revoke all on function public.notify_arena_season_completed() from public, anon, authenticated;
grant execute on function public.notify_arena_season_completed() to service_role;

drop trigger if exists arena_season_archives_notify_completed on public.arena_season_archives;
create trigger arena_season_archives_notify_completed
after insert on public.arena_season_archives
for each row execute function public.notify_arena_season_completed();

commit;
