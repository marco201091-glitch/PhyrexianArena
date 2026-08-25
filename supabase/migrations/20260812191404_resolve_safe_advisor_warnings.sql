-- Resolve advisor warnings with behavior-preserving changes only.

begin;

drop policy if exists "Users can view group members" on public.group_members;
drop policy if exists "Users can join groups" on public.group_members;
drop policy if exists "Users can leave groups" on public.group_members;

alter policy arena_guest_claim_links_manager_select
  on public.arena_guest_claim_links
  to authenticated
  using (
    created_by = (select auth.uid())
    or public.is_admin((select auth.uid()))
  );

alter function public.update_updated_at_column() set search_path = public, pg_temp;
alter function public.is_demo_user() set search_path = public, pg_temp;
alter function public.touch_live_game_updated_at() set search_path = public, pg_temp;

commit;
