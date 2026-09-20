-- Draw-neutral win rate.
--
-- A drawn match stores is_draw = true and leaves every participant at
-- is_winner = false, so a rollup that derives the rate as
-- wins / games_played silently counts a draw as a loss. The rate is defined as
-- wins / (games_played - draws) instead: a draw stays in games_played so the
-- match total stays honest, but it reaches neither the numerator nor the
-- denominator.
--
-- No function here divides anything. They only surface `draws` next to
-- games_played and wins, so every client derives the rate from the same three
-- counters and the formula lives in exactly one place (expo/lib/win-rate.ts).

-- 1. Season archives snapshotted under the old denominator are rebuilt in
--    place. The marker lets the rollover tell a current archive from a stale
--    one, so the rebuild is targeted and runs once.

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
  v_payload_version text := '2';
  v_first_match_at timestamptz;
  v_current_start date;
  v_period_start date;
  v_period_end date;
  v_analytics jsonb;
  v_match_summary jsonb;
  v_is_current boolean;
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

    select exists (
      select 1
      from public.arena_season_archives as archive
      where archive.group_id = p_group_id
        and archive.season_start = v_period_start
        and archive.season_end = v_period_end
        and archive.summary ->> 'payloadVersion' = v_payload_version
    ) into v_is_current;

    if v_is_current then
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
        v_analytics || pg_catalog.jsonb_build_object(
          'matches', v_match_summary,
          'payloadVersion', v_payload_version
        )
      )
      on conflict (group_id, season_start, season_end) do update
        set reset_month = excluded.reset_month,
            summary = excluded.summary,
            archived_at = case
              when public.arena_season_archives.summary is distinct from excluded.summary then now()
              else public.arena_season_archives.archived_at
            end;
    end if;

    v_period_start := v_period_end;
  end loop;
end;
$$;

revoke all on function private.refresh_arena_season_archives(uuid, smallint, timestamptz)
  from public, anon, authenticated;

-- 2. Member-facing analytics bundle. The wrapper calls this from a
--    LANGUAGE sql body, so PostgreSQL tracks the dependency and the function
--    cannot be dropped. Its return type is unchanged, so replace it in place.

create or replace function public.get_arena_analytics_bundle_base(
  p_group_id uuid,
  p_since timestamptz default null,
  p_until timestamptz default null
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with facts as materialized (
    select
      match.id as match_id,
      match.played_at,
      match.is_draw,
      match.duration_seconds,
      match.tracking_version,
      match.win_condition,
      participant.user_id,
      participant.guest_id,
      participant.deck_id,
      participant.guest_deck_id,
      participant.is_winner,
      participant.placement,
      participant.final_life,
      participant.eliminated_at,
      (
        participant.eliminated_at is not null
        and participant.eliminated_at = min(participant.eliminated_at)
          over (partition by match.id)
      ) as was_first_eliminated,
      participant.life_lost,
      participant.life_gained,
      participant.life_damage_dealt,
      participant.commander_damage_dealt,
      participant.infect_dealt,
      participant.eliminations_caused,
      participant.group_damage_dealt,
      participant.group_damage_events,
      coalesce(
        participant.participant_name_snapshot,
        guest.display_name,
        nullif(profile.display_name, ''),
        profile.username,
        'Player'
      ) as participant_name,
      coalesce(participant.deck_name_snapshot, deck.name, guest_deck.name, 'Deck') as deck_name,
      coalesce(participant.commander_snapshot, deck.commander, guest_deck.commander, 'Unknown commander') as commander,
      coalesce(participant.commander_image_snapshot, deck.commander_image, guest_deck.commander_image) as commander_image,
      coalesce(participant.deck_bracket_snapshot, deck.bracket, guest_deck.bracket) as bracket,
      coalesce(participant.color_identity_snapshot, deck.color_identity, guest_deck.color_identity, '{}'::text[]) as color_identity
    from public.matches as match
    join public.match_participants as participant on participant.match_id = match.id
    left join public.profiles as profile on profile.id = participant.user_id
    left join public.arena_guests as guest on guest.id = participant.guest_id
    left join public.decks as deck on deck.id = participant.deck_id
    left join public.arena_guest_decks as guest_deck on guest_deck.id = participant.guest_deck_id
    where match.group_id = p_group_id
      and (p_since is null or match.played_at >= p_since)
      and (p_until is null or match.played_at < p_until)
      and (
        public.is_admin((select auth.uid()))
        or public.is_group_member(p_group_id, (select auth.uid()))
      )
  ),
  player_rollup as (
    select
      case when user_id is not null then 'user:' || user_id::text else 'guest:' || guest_id::text end as key,
      user_id,
      guest_id,
      (array_agg(participant_name order by played_at desc))[1] as display_name,
      guest_id is not null as is_guest,
      count(*)::integer as games_played,
      count(*) filter (where is_draw)::integer as draws,
      count(*) filter (where is_winner)::integer as wins
    from facts
    group by key, user_id, guest_id, guest_id is not null
  ),
  commander_rollup as (
    select
      commander,
      commander_image,
      bracket,
      count(*)::integer as games_played,
      count(*) filter (where is_draw)::integer as draws,
      count(*) filter (where is_winner)::integer as wins
    from facts
    group by commander, commander_image, bracket
  ),
  color_rollup as (
    select
      color_identity,
      bracket,
      count(*)::integer as appearances,
      count(*) filter (where is_draw)::integer as draws,
      count(*) filter (where is_winner)::integer as wins
    from facts
    group by color_identity, bracket
  ),
  deck_rollup as (
    select
      case when deck_id is not null then 'deck:' || deck_id::text else 'guest:' || guest_deck_id::text end as key,
      coalesce(deck_id, guest_deck_id) as deck_id,
      guest_deck_id is not null as is_guest_deck,
      (array_agg(deck_name order by played_at desc))[1] as deck_name,
      (array_agg(commander order by played_at desc))[1] as commander,
      (array_agg(commander_image order by played_at desc))[1] as commander_image,
      count(*)::integer as games_played,
      count(*) filter (
        where tracking_version is not null or duration_seconds is not null
      )::integer as tracked_games,
      count(*) filter (where is_draw)::integer as draws,
      count(*) filter (where is_winner)::integer as wins,
      count(*) filter (where placement = 2)::integer as second_places,
      count(*) filter (where was_first_eliminated)::integer as first_eliminations,
      count(*) filter (
        where is_winner and final_life is not null and final_life < 10
      )::integer as comeback_wins,
      count(*) filter (where is_winner and win_condition = 'combo')::integer as combo_wins,
      count(*) filter (where is_winner and win_condition = 'alternate_card')::integer as alternate_wins,
      coalesce(sum(life_damage_dealt) filter (
        where tracking_version is not null or duration_seconds is not null
      ), 0)::integer as total_damage_dealt,
      coalesce(sum(life_lost) filter (
        where tracking_version is not null or duration_seconds is not null
      ), 0)::integer as total_damage_taken,
      coalesce(sum(life_gained) filter (
        where tracking_version is not null or duration_seconds is not null
      ), 0)::integer as total_life_gained,
      coalesce(sum(commander_damage_dealt) filter (
        where tracking_version is not null or duration_seconds is not null
      ), 0)::integer as commander_damage_dealt,
      coalesce(sum(infect_dealt) filter (
        where tracking_version is not null or duration_seconds is not null
      ), 0)::integer as infect_dealt,
      coalesce(sum(eliminations_caused) filter (
        where tracking_version is not null or duration_seconds is not null
      ), 0)::integer as eliminations,
      coalesce(sum(group_damage_dealt) filter (
        where tracking_version is not null or duration_seconds is not null
      ), 0)::integer as group_damage_dealt,
      coalesce(sum(group_damage_events) filter (
        where tracking_version is not null or duration_seconds is not null
      ), 0)::integer as group_damage_events,
      round(percentile_cont(0.5) within group (order by duration_seconds)
        filter (where is_winner and duration_seconds is not null))::integer
        as median_winning_duration_seconds
    from facts
    where deck_id is not null or guest_deck_id is not null
    group by key, coalesce(deck_id, guest_deck_id), guest_deck_id is not null
  )
  select pg_catalog.jsonb_build_object(
    'players', coalesce((select pg_catalog.jsonb_agg(player_rollup) from player_rollup), '[]'::jsonb),
    'commanders', coalesce((select pg_catalog.jsonb_agg(commander_rollup) from commander_rollup), '[]'::jsonb),
    'colors', coalesce((select pg_catalog.jsonb_agg(color_rollup) from color_rollup), '[]'::jsonb),
    'decks', coalesce((select pg_catalog.jsonb_agg(deck_rollup) from deck_rollup), '[]'::jsonb),
    'totalMatches', (select count(distinct match_id)::integer from facts)
  );
$$;

revoke all on function public.get_arena_analytics_bundle_base(uuid, timestamptz, timestamptz)
  from public, anon;
grant execute on function public.get_arena_analytics_bundle_base(uuid, timestamptz, timestamptz)
  to authenticated;

-- 3. Public Arena bundle. Same counters, separate function, service_role only.

create or replace function public.get_public_arena_analytics_bundle(
  p_group_id uuid,
  p_since timestamptz default null,
  p_until timestamptz default null
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with facts as materialized (
    select
      match.id as match_id,
      match.played_at,
      match.is_draw,
      participant.user_id,
      participant.guest_id,
      participant.deck_id,
      participant.guest_deck_id,
      participant.is_winner,
      coalesce(
        participant.participant_name_snapshot,
        guest.display_name,
        nullif(profile.display_name, ''),
        profile.username,
        'Player'
      ) as participant_name,
      coalesce(participant.deck_name_snapshot, deck.name, guest_deck.name, 'Deck') as deck_name,
      coalesce(
        participant.commander_snapshot,
        deck.commander,
        guest_deck.commander,
        'Unknown commander'
      ) as commander,
      coalesce(
        participant.commander_image_snapshot,
        deck.commander_image,
        guest_deck.commander_image
      ) as commander_image,
      coalesce(participant.deck_bracket_snapshot, deck.bracket, guest_deck.bracket) as bracket,
      coalesce(
        participant.color_identity_snapshot,
        deck.color_identity,
        guest_deck.color_identity,
        '{}'::text[]
      ) as color_identity,
      coalesce(
        nullif(deck_owner.display_name, ''),
        deck_owner.username,
        guest.display_name,
        participant.participant_name_snapshot,
        'Player'
      ) as owner_display_name
    from public.matches as match
    join public.match_participants as participant on participant.match_id = match.id
    left join public.profiles as profile on profile.id = participant.user_id
    left join public.arena_guests as guest on guest.id = participant.guest_id
    left join public.decks as deck on deck.id = participant.deck_id
    left join public.profiles as deck_owner on deck_owner.id = deck.user_id
    left join public.arena_guest_decks as guest_deck on guest_deck.id = participant.guest_deck_id
    where match.group_id = p_group_id
      and (p_since is null or match.played_at >= p_since)
      and (p_until is null or match.played_at < p_until)
  ),
  player_rollup as (
    select
      case
        when user_id is not null then 'user:' || user_id::text
        else 'guest:' || guest_id::text
      end as key,
      user_id,
      guest_id,
      (array_agg(participant_name order by played_at desc))[1] as display_name,
      guest_id is not null as is_guest,
      count(*)::integer as games_played,
      count(*) filter (where is_draw)::integer as draws,
      count(*) filter (where is_winner)::integer as wins
    from facts
    group by key, user_id, guest_id, guest_id is not null
  ),
  deck_rollup as (
    select
      case
        when deck_id is not null then 'deck:' || deck_id::text
        else 'guest:' || guest_deck_id::text
      end as key,
      coalesce(deck_id, guest_deck_id) as deck_id,
      guest_deck_id is not null as is_guest_deck,
      (array_agg(deck_name order by played_at desc))[1] as deck_name,
      (array_agg(commander order by played_at desc))[1] as commander,
      (array_agg(commander_image order by played_at desc))[1] as commander_image,
      (array_agg(bracket order by played_at desc))[1] as bracket,
      (array_agg(owner_display_name order by played_at desc))[1] as owner_display_name,
      count(*)::integer as games_played,
      count(*) filter (where is_draw)::integer as draws,
      count(*) filter (where is_winner)::integer as wins
    from facts
    where deck_id is not null or guest_deck_id is not null
    group by key, coalesce(deck_id, guest_deck_id), guest_deck_id is not null
  ),
  color_rollup as (
    select
      color_identity,
      bracket,
      count(*)::integer as appearances,
      count(*) filter (where is_draw)::integer as draws,
      count(*) filter (where is_winner)::integer as wins
    from facts
    group by color_identity, bracket
  )
  select pg_catalog.jsonb_build_object(
    'players', coalesce(
      (select pg_catalog.jsonb_agg(player_rollup) from player_rollup),
      '[]'::jsonb
    ),
    'decks', coalesce(
      (select pg_catalog.jsonb_agg(deck_rollup) from deck_rollup),
      '[]'::jsonb
    ),
    'colors', coalesce(
      (select pg_catalog.jsonb_agg(color_rollup) from color_rollup),
      '[]'::jsonb
    ),
    'totalMatches', (select count(distinct match_id)::integer from facts)
  );
$$;

revoke all on function public.get_public_arena_analytics_bundle(uuid, timestamptz, timestamptz)
  from public, anon, authenticated;
grant execute on function public.get_public_arena_analytics_bundle(uuid, timestamptz, timestamptz)
  to service_role;

-- 4. Personal and global dashboard facts. The return type changes, so the
--    functions are dropped and recreated; win_condition is preserved.

drop function if exists public.get_personal_analytics_facts(uuid);

create function public.get_personal_analytics_facts(p_user_id uuid default null)
returns table (
  is_winner boolean,
  deck_id uuid,
  played_at timestamptz,
  is_draw boolean,
  win_condition text,
  name text,
  commander text,
  commander_image text,
  color_identity text[],
  bracket text,
  source_type text,
  source_url text,
  owner_username text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    participant.is_winner,
    participant.deck_id,
    match.played_at,
    match.is_draw,
    match.win_condition,
    coalesce(participant.deck_name_snapshot, deck.name, 'Deck'),
    coalesce(participant.commander_snapshot, deck.commander, 'Unknown commander'),
    coalesce(participant.commander_image_snapshot, deck.commander_image),
    coalesce(participant.color_identity_snapshot, deck.color_identity, '{}'::text[]),
    coalesce(participant.deck_bracket_snapshot, deck.bracket),
    deck.source_type,
    deck.source_url,
    profile.username
  from public.match_participants as participant
  join public.matches as match on match.id = participant.match_id
  left join public.decks as deck on deck.id = participant.deck_id
  left join public.profiles as profile on profile.id = participant.user_id
  where participant.user_id = coalesce(p_user_id, (select auth.uid()))
    and participant.deck_id is not null
    and (
      participant.user_id = (select auth.uid())
      or public.is_admin((select auth.uid()))
    )
  order by match.played_at;
$$;

revoke all on function public.get_personal_analytics_facts(uuid)
  from public, anon;
grant execute on function public.get_personal_analytics_facts(uuid)
  to authenticated;

drop function if exists public.get_global_analytics_facts();

create function public.get_global_analytics_facts()
returns table (
  is_winner boolean,
  deck_id uuid,
  played_at timestamptz,
  is_draw boolean,
  win_condition text,
  name text,
  commander text,
  commander_image text,
  color_identity text[],
  bracket text,
  source_type text,
  source_url text,
  owner_username text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    participant.is_winner,
    participant.deck_id,
    match.played_at,
    match.is_draw,
    match.win_condition,
    coalesce(participant.deck_name_snapshot, deck.name, 'Deck'),
    coalesce(participant.commander_snapshot, deck.commander, 'Unknown commander'),
    coalesce(participant.commander_image_snapshot, deck.commander_image),
    coalesce(participant.color_identity_snapshot, deck.color_identity, '{}'::text[]),
    coalesce(participant.deck_bracket_snapshot, deck.bracket),
    deck.source_type,
    deck.source_url,
    profile.username
  from public.match_participants as participant
  join public.matches as match on match.id = participant.match_id
  left join public.decks as deck on deck.id = participant.deck_id
  left join public.profiles as profile on profile.id = participant.user_id
  where participant.user_id is not null
    and participant.deck_id is not null
    and participant.user_id not in (
      select excluded.excluded_user_id
      from public.get_analytics_excluded_user_ids() as excluded(excluded_user_id)
    )
  order by match.played_at;
$$;

revoke all on function public.get_global_analytics_facts()
  from public, anon, authenticated;
grant execute on function public.get_global_analytics_facts()
  to service_role;

-- 5. Profile deck rollup. The return type gains a column, so this one is
--    dropped and recreated too.

drop function if exists public.get_profile_deck_performance(uuid);

create function public.get_profile_deck_performance(p_user_id uuid default null)
returns table (
  deck_id uuid,
  games_played integer,
  draws integer,
  wins integer,
  mastery_points integer,
  tracked_games integer,
  second_places integer,
  damage_dealt bigint,
  damage_taken bigint,
  life_gained bigint,
  commander_damage bigint,
  infect_dealt bigint,
  eliminations bigint,
  median_winning_duration_seconds integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with authorized_user as (
    select coalesce(p_user_id, (select auth.uid())) as id
  )
  select
    deck.id as deck_id,
    count(participant.id)::integer as games_played,
    count(participant.id) filter (where match.is_draw)::integer as draws,
    count(participant.id) filter (where participant.is_winner)::integer as wins,
    (
      count(participant.id)
      + 2 * count(participant.id) filter (where participant.is_winner)
    )::integer as mastery_points,
    count(participant.id) filter (
      where match.tracking_version is not null
        or match.duration_seconds is not null
    )::integer as tracked_games,
    count(participant.id) filter (where participant.placement = 2)::integer as second_places,
    coalesce(sum(participant.life_damage_dealt) filter (
      where match.tracking_version is not null
        or match.duration_seconds is not null
    ), 0)::bigint as damage_dealt,
    coalesce(sum(participant.life_lost) filter (
      where match.tracking_version is not null
        or match.duration_seconds is not null
    ), 0)::bigint as damage_taken,
    coalesce(sum(participant.life_gained) filter (
      where match.tracking_version is not null
        or match.duration_seconds is not null
    ), 0)::bigint as life_gained,
    coalesce(sum(participant.commander_damage_dealt) filter (
      where match.tracking_version is not null
        or match.duration_seconds is not null
    ), 0)::bigint as commander_damage,
    coalesce(sum(participant.infect_dealt) filter (
      where match.tracking_version is not null
        or match.duration_seconds is not null
    ), 0)::bigint as infect_dealt,
    coalesce(sum(participant.eliminations_caused) filter (
      where match.tracking_version is not null
        or match.duration_seconds is not null
    ), 0)::bigint as eliminations,
    round(
      percentile_cont(0.5) within group (order by match.duration_seconds)
      filter (
        where participant.is_winner
          and match.duration_seconds is not null
      )
    )::integer as median_winning_duration_seconds
  from authorized_user
  join public.decks as deck
    on deck.user_id = authorized_user.id
   and deck.group_id is null
  left join public.match_participants as participant
    on participant.deck_id = deck.id
  left join public.matches as match
    on match.id = participant.match_id
  where authorized_user.id = (select auth.uid())
    or public.is_admin((select auth.uid()))
  group by deck.id;
$$;

revoke all on function public.get_profile_deck_performance(uuid)
  from public, anon;
grant execute on function public.get_profile_deck_performance(uuid)
  to authenticated;

comment on function public.get_profile_deck_performance(uuid) is
  'All-time deck rollup. Mastery is derived as 1 point per game plus 2 extra per win, so V6 history is backfilled automatically without mutable counters. A draw therefore earns the same single participation point as a loss.';

notify pgrst, 'reload schema';
