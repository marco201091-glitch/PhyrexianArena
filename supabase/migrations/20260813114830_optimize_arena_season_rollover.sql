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
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_group_id::text, 761934)
  );

  select min(match.played_at)
    into v_first_match_at
  from public.matches as match
  where match.group_id = p_group_id;

  if v_first_match_at is null then
    return;
  end if;

  v_current_start := private.arena_season_start(p_now, p_reset_month);
  v_period_start := private.arena_season_start(v_first_match_at, p_reset_month);

  delete from public.arena_season_archives as archive
  where archive.group_id = p_group_id
    and archive.reset_month <> p_reset_month;

  while v_period_start < v_current_start loop
    v_period_end := (v_period_start + interval '1 year')::date;

    if exists (
      select 1
      from public.arena_season_archives as archive
      where archive.group_id = p_group_id
        and archive.season_start = v_period_start
        and archive.season_end = v_period_end
    ) then
      v_period_start := v_period_end;
      continue;
    end if;

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
      on conflict (group_id, season_start, season_end) do nothing;
    end if;

    v_period_start := v_period_end;
  end loop;
end;
$$;

revoke all on function private.refresh_arena_season_archives(uuid, smallint, timestamptz)
  from public, anon, authenticated;
