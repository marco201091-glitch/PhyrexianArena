alter table public.groups
  add column if not exists season_reset_month smallint not null default 1;

alter table public.groups
  drop constraint if exists groups_season_reset_month_check;

alter table public.groups
  add constraint groups_season_reset_month_check
  check (season_reset_month between 1 and 12);

comment on column public.groups.season_reset_month is
  'UTC calendar month (1-12) in which this Arena annual season starts.';

create table if not exists public.arena_season_archives (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  season_start date not null,
  season_end date not null,
  reset_month smallint not null check (reset_month between 1 and 12),
  summary jsonb not null default '{}'::jsonb,
  archived_at timestamptz not null default now(),
  constraint arena_season_archives_valid_period check (season_end = (season_start + interval '1 year')::date),
  constraint arena_season_archives_unique_period unique (group_id, season_start, season_end)
);

comment on table public.arena_season_archives is
  'Derived annual Arena snapshots. Source matches remain intact and personal lifetime scores are unaffected.';

create index if not exists arena_season_archives_group_end_idx
  on public.arena_season_archives (group_id, season_end desc);

alter table public.arena_season_archives enable row level security;

drop policy if exists arena_season_archives_select_member on public.arena_season_archives;
create policy arena_season_archives_select_member
  on public.arena_season_archives
  for select
  to authenticated
  using (
    public.is_admin((select auth.uid()))
    or public.is_group_member(group_id, (select auth.uid()))
  );

revoke all on table public.arena_season_archives from public, anon, authenticated;
grant select on table public.arena_season_archives to authenticated;

create or replace function private.arena_season_start(
  p_at timestamptz,
  p_reset_month smallint
)
returns date
language sql
immutable
set search_path = ''
as $$
  select pg_catalog.make_date(
    extract(year from p_at at time zone 'UTC')::integer
      - case
          when extract(month from p_at at time zone 'UTC')::integer < p_reset_month then 1
          else 0
        end,
    p_reset_month,
    1
  );
$$;

revoke all on function private.arena_season_start(timestamptz, smallint)
  from public, anon, authenticated;

create or replace function private.refresh_arena_season_archives(
  p_group_id uuid,
  p_reset_month smallint,
  p_now timestamptz default now()
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_first_match_at timestamptz;
  v_current_start date;
  v_period_start date;
  v_period_end date;
  v_analytics jsonb;
  v_match_summary jsonb;
begin
  select min(match.played_at)
    into v_first_match_at
  from public.matches as match
  where match.group_id = p_group_id;

  if v_first_match_at is null then
    delete from public.arena_season_archives as archive
    where archive.group_id = p_group_id;
    return;
  end if;

  v_current_start := private.arena_season_start(p_now, p_reset_month);
  v_period_start := private.arena_season_start(v_first_match_at, p_reset_month);

  delete from public.arena_season_archives as archive
  where archive.group_id = p_group_id
    and archive.reset_month <> p_reset_month;

  while v_period_start < v_current_start loop
    v_period_end := (v_period_start + interval '1 year')::date;

    select public.get_arena_analytics_bundle(
      p_group_id,
      v_period_start::timestamp at time zone 'UTC',
      v_period_end::timestamp at time zone 'UTC'
    ) into v_analytics;

    select pg_catalog.jsonb_build_object(
      'draws', count(*) filter (where match.is_draw),
      'trackedMatches', count(*) filter (
        where match.tracking_version is not null or match.duration_seconds is not null
      ),
      'totalDurationSeconds', coalesce(sum(match.duration_seconds), 0),
      'averageDurationSeconds', round(avg(match.duration_seconds))::integer,
      'participants', coalesce(sum(participant_count.total), 0)
    )
      into v_match_summary
    from public.matches as match
    left join lateral (
      select count(*)::integer as total
      from public.match_participants as participant
      where participant.match_id = match.id
    ) as participant_count on true
    where match.group_id = p_group_id
      and match.played_at >= v_period_start::timestamp at time zone 'UTC'
      and match.played_at < v_period_end::timestamp at time zone 'UTC';

    if coalesce((v_analytics ->> 'totalMatches')::integer, 0) > 0 then
      insert into public.arena_season_archives (
        group_id,
        season_start,
        season_end,
        reset_month,
        summary
      ) values (
        p_group_id,
        v_period_start,
        v_period_end,
        p_reset_month,
        v_analytics || pg_catalog.jsonb_build_object('matches', v_match_summary)
      )
      on conflict (group_id, season_start, season_end) do update
        set reset_month = excluded.reset_month,
            summary = excluded.summary,
            archived_at = case
              when public.arena_season_archives.summary is distinct from excluded.summary then now()
              else public.arena_season_archives.archived_at
            end;
    else
      delete from public.arena_season_archives as archive
      where archive.group_id = p_group_id
        and archive.season_start = v_period_start
        and archive.season_end = v_period_end;
    end if;

    v_period_start := v_period_end;
  end loop;
end;
$$;

revoke all on function private.refresh_arena_season_archives(uuid, smallint, timestamptz)
  from public, anon, authenticated;

create or replace function public.get_arena_season_context(p_group_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_reset_month smallint;
  v_current_start date;
  v_current_end date;
  v_archives jsonb;
begin
  if (select auth.uid()) is null or not (
    public.is_admin((select auth.uid()))
    or public.is_group_member(p_group_id, (select auth.uid()))
  ) then
    raise exception 'Arena membership required' using errcode = '42501';
  end if;

  select arena.season_reset_month
    into v_reset_month
  from public.groups as arena
  where arena.id = p_group_id;

  if v_reset_month is null then
    raise exception 'Arena not found' using errcode = 'P0002';
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

create or replace function public.set_arena_season_reset_month(
  p_group_id uuid,
  p_reset_month smallint
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_created_by uuid;
begin
  if p_reset_month is null or p_reset_month < 1 or p_reset_month > 12 then
    raise exception 'Reset month must be between 1 and 12' using errcode = '22023';
  end if;

  select arena.created_by
    into v_created_by
  from public.groups as arena
  where arena.id = p_group_id
  for update;

  if v_created_by is null then
    raise exception 'Arena not found' using errcode = 'P0002';
  end if;

  if (select auth.uid()) is null or not (
    v_created_by = (select auth.uid())
    or public.is_admin((select auth.uid()))
  ) then
    raise exception 'Arena manager access required' using errcode = '42501';
  end if;

  update public.groups
  set season_reset_month = p_reset_month
  where id = p_group_id;

  delete from public.arena_season_archives
  where group_id = p_group_id;

  return public.get_arena_season_context(p_group_id);
end;
$$;

revoke all on function public.set_arena_season_reset_month(uuid, smallint)
  from public, anon;
grant execute on function public.set_arena_season_reset_month(uuid, smallint)
  to authenticated;

notify pgrst, 'reload schema';
