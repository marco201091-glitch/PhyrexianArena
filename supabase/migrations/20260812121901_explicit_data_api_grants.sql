-- Make Data API access explicit while preserving every permission used by the
-- current web and mobile clients. RLS remains the row-level authorization layer.

begin;

grant select on table
  public.groups,
  public.matches,
  public.match_participants,
  public.arena_guests,
  public.arena_guest_decks
to anon;

grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update, delete on table
  public.groups,
  public.decks,
  public.matches,
  public.match_participants,
  public.arena_guests,
  public.arena_guest_decks,
  public.live_games
to authenticated;
grant select, insert, delete on table public.group_members to authenticated;
grant select on table
  public.live_game_participants,
  public.arena_guest_claim_links
to authenticated;
grant select, insert, update on table public.live_game_telemetry to authenticated;

-- Some V8 self-hosted stacks predate these optional notification tables. Grant
-- access when present without making the migration fail on those installations.
do $$
begin
  if to_regclass('public.push_tokens') is not null then
    execute 'grant select, insert, update, delete on table public.push_tokens to authenticated';
  end if;
  if to_regclass('public.arena_invitations') is not null then
    execute 'grant select on table public.arena_invitations to authenticated';
  end if;
  if to_regclass('public.app_notifications') is not null then
    execute 'grant select on table public.app_notifications to authenticated';
  end if;
end
$$;

-- Inserts into identity/serial-backed tables need sequence access. Keeping this
-- schema-wide matches the existing clients and avoids a behavior change.
grant usage, select on all sequences in schema public to authenticated;

-- Service-role behavior is unchanged and remains suitable for server-only APIs.
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- New objects must opt into Data API exposure in their own migration. Supabase
-- self-hosted uses both postgres and supabase_admin as object owners, so update
-- defaults for each role when present. Existing objects are not affected.
do $$
declare
  owner_role text;
begin
  for owner_role in
    select rolname
    from pg_roles
    where rolname = current_user
       or (
         rolname in ('postgres', 'supabase_admin')
         and (select rolsuper from pg_roles where rolname = current_user)
       )
  loop
    execute format(
      'alter default privileges for role %I in schema public revoke all on tables from anon, authenticated',
      owner_role
    );
    execute format(
      'alter default privileges for role %I in schema public revoke all on sequences from anon, authenticated',
      owner_role
    );
    execute format(
      'alter default privileges for role %I in schema public revoke execute on functions from anon, authenticated',
      owner_role
    );
    execute format(
      'alter default privileges for role %I in schema public grant all on tables to service_role',
      owner_role
    );
    execute format(
      'alter default privileges for role %I in schema public grant all on sequences to service_role',
      owner_role
    );
    execute format(
      'alter default privileges for role %I in schema public grant execute on functions to service_role',
      owner_role
    );
  end loop;
end
$$;

commit;
