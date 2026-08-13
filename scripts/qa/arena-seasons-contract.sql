begin;

do $$
declare
  v_actor uuid;
  v_group uuid;
  v_match uuid;
  v_context jsonb;
begin
  select profile.id into v_actor
  from public.profiles as profile
  order by profile.created_at
  limit 1;

  if v_actor is null then
    raise exception 'QA requires at least one profile';
  end if;

  perform set_config('request.jwt.claim.sub', v_actor::text, true);

  insert into public.groups (name, description, created_by)
  values ('Season contract QA', 'Rolled back automatically', v_actor)
  returning id into v_group;

  insert into public.group_members (group_id, user_id)
  values (v_group, v_actor)
  on conflict (group_id, user_id) do nothing;

  insert into public.matches (group_id, winner_id, played_at, created_by, notes)
  values (v_group, v_actor, '2024-02-15T20:00:00Z', v_actor, 'Season contract QA')
  returning id into v_match;

  insert into public.match_participants (match_id, user_id, is_winner)
  values (v_match, v_actor, true);

  v_context := public.get_arena_season_context(v_group);
  if (v_context ->> 'resetMonth')::integer <> 1 then
    raise exception 'Expected January default: %', v_context;
  end if;
  if pg_catalog.jsonb_array_length(v_context -> 'archives') <> 1 then
    raise exception 'Expected one non-empty archived season: %', v_context;
  end if;
  if (v_context #>> '{archives,0,summary,totalMatches}')::integer <> 1 then
    raise exception 'Expected one archived match: %', v_context;
  end if;

  v_context := public.get_arena_season_context(v_group);
  if pg_catalog.jsonb_array_length(v_context -> 'archives') <> 1 then
    raise exception 'Idempotent refresh changed archive count: %', v_context;
  end if;

  insert into public.matches (group_id, winner_id, played_at, created_by, notes)
  values (v_group, v_actor, '2024-03-15T20:00:00Z', v_actor, 'Late historical edit')
  returning id into v_match;
  insert into public.match_participants (match_id, user_id, is_winner)
  values (v_match, v_actor, true);

  v_context := public.get_arena_season_context(v_group);
  if (v_context #>> '{archives,0,summary,totalMatches}')::integer <> 1 then
    raise exception 'A saved archive was unexpectedly rewritten: %', v_context;
  end if;

  v_context := public.set_arena_season_reset_month(v_group, 9::smallint);
  if (v_context ->> 'resetMonth')::integer <> 9 then
    raise exception 'Expected September reset: %', v_context;
  end if;
  if (v_context #>> '{archives,0,seasonStart}') <> '2023-09-01' then
    raise exception 'Expected archive to be rebuilt on the new boundary: %', v_context;
  end if;
  if (v_context #>> '{archives,0,summary,totalMatches}')::integer <> 2 then
    raise exception 'Expected reset-month change to rebuild archive from source matches: %', v_context;
  end if;

  begin
    perform public.set_arena_season_reset_month(v_group, 13::smallint);
    raise exception 'Invalid reset month was accepted';
  exception
    when sqlstate '22023' then null;
  end;
end;
$$;

rollback;
