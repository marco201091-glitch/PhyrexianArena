drop policy if exists arena_season_archives_select_member on public.arena_season_archives;
create policy arena_season_archives_select_member
  on public.arena_season_archives
  for select
  to authenticated
  using (
    public.is_admin((select auth.uid()))
    or public.is_group_member(group_id, (select auth.uid()))
    or exists (
      select 1
      from public.groups as arena
      where arena.id = group_id
        and arena.created_by = (select auth.uid())
    )
  );

create or replace function public.get_arena_season_context(p_group_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_reset_month smallint;
  v_created_by uuid;
  v_current_start date;
  v_current_end date;
  v_archives jsonb;
begin
  select arena.season_reset_month, arena.created_by
    into v_reset_month, v_created_by
  from public.groups as arena
  where arena.id = p_group_id;

  if v_reset_month is null then
    raise exception 'Arena not found' using errcode = 'P0002';
  end if;

  if (select auth.uid()) is null or not (
    v_created_by = (select auth.uid())
    or public.is_admin((select auth.uid()))
    or public.is_group_member(p_group_id, (select auth.uid()))
  ) then
    raise exception 'Arena membership required' using errcode = '42501';
  end if;

  v_current_start := private.arena_season_start(now(), v_reset_month);
  v_current_end := (v_current_start + interval '1 year')::date;

  perform private.refresh_arena_season_archives(p_group_id, v_reset_month, now());

  select coalesce(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'id', archive.id,
        'seasonStart', archive.season_start,
        'seasonEnd', archive.season_end,
        'resetMonth', archive.reset_month,
        'summary', archive.summary,
        'archivedAt', archive.archived_at
      ) order by archive.season_start desc
    ),
    '[]'::jsonb
  )
    into v_archives
  from public.arena_season_archives as archive
  where archive.group_id = p_group_id;

  return pg_catalog.jsonb_build_object(
    'resetMonth', v_reset_month,
    'currentSeasonStart', v_current_start,
    'currentSeasonEnd', v_current_end,
    'archives', v_archives
  );
end;
$$;

revoke all on function public.get_arena_season_context(uuid)
  from public, anon;
grant execute on function public.get_arena_season_context(uuid)
  to authenticated;

notify pgrst, 'reload schema';
