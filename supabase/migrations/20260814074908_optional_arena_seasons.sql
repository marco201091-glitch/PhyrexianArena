alter table public.groups
  add column if not exists seasons_enabled boolean not null default true;

comment on column public.groups.seasons_enabled is
  'Whether annual Arena seasons and season-scoped analytics are enabled.';

create or replace function public.get_arena_season_context(p_group_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_enabled boolean;
  v_reset_month smallint;
  v_created_by uuid;
  v_current_start date;
  v_current_end date;
  v_archives jsonb;
begin
  select arena.seasons_enabled, arena.season_reset_month, arena.created_by
    into v_enabled, v_reset_month, v_created_by
  from public.groups as arena
  where arena.id = p_group_id;

  if v_created_by is null then
    raise exception 'Arena not found' using errcode = 'P0002';
  end if;

  if (select auth.uid()) is null or not (
    v_created_by = (select auth.uid())
    or public.is_admin((select auth.uid()))
    or public.is_group_member(p_group_id, (select auth.uid()))
  ) then
    raise exception 'Arena membership required' using errcode = '42501';
  end if;

  if not v_enabled then
    return pg_catalog.jsonb_build_object(
      'enabled', false,
      'resetMonth', v_reset_month,
      'archives', '[]'::jsonb
    );
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
    'enabled', true,
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

create or replace function public.set_arena_season_settings(
  p_group_id uuid,
  p_enabled boolean,
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
  v_previous_reset_month smallint;
begin
  if p_enabled is null then
    raise exception 'Season enabled state is required' using errcode = '22023';
  end if;

  if p_reset_month is null or p_reset_month < 1 or p_reset_month > 12 then
    raise exception 'Reset month must be between 1 and 12' using errcode = '22023';
  end if;

  select arena.created_by, arena.season_reset_month
    into v_created_by, v_previous_reset_month
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
  set seasons_enabled = p_enabled,
      season_reset_month = p_reset_month
  where id = p_group_id;

  if v_previous_reset_month <> p_reset_month then
    delete from public.arena_season_archives
    where group_id = p_group_id;
  end if;

  return public.get_arena_season_context(p_group_id);
end;
$$;

revoke all on function public.set_arena_season_settings(uuid, boolean, smallint)
  from public, anon;
grant execute on function public.set_arena_season_settings(uuid, boolean, smallint)
  to authenticated;

-- Public Arena pages are served through the trusted web API. Aggregate the
-- complete requested period in PostgreSQL so disabling seasons never downloads
-- an unbounded match history into the Next.js process. Raw V8 match facts stay
-- authoritative and are never removed.
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

notify pgrst, 'reload schema';
