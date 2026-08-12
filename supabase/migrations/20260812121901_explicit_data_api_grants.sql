-- Make Data API access explicit while preserving every permission used by the
-- current web and mobile clients. RLS remains the row-level authorization layer.

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
  public.live_games,
  public.push_tokens
to authenticated;
grant select, insert, delete on table public.group_members to authenticated;
grant select on table
  public.live_game_participants,
  public.arena_invitations,
  public.app_notifications,
  public.arena_guest_claim_links
to authenticated;
grant select, insert, update on table public.live_game_telemetry to authenticated;

-- Inserts into identity/serial-backed tables need sequence access. Keeping this
-- schema-wide matches the existing clients and avoids a behavior change.
grant usage, select on all sequences in schema public to authenticated;

-- Service-role behavior is unchanged and remains suitable for server-only APIs.
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- New objects must opt into Data API exposure in their own migration. These
-- defaults do not change privileges on any existing object.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from anon, authenticated;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;
