-- Resolve advisor warnings with behavior-preserving changes only.

begin;

-- These V1 policies are strict subsets of the current policies. Keeping both
-- makes PostgreSQL evaluate duplicate permissive expressions and lets the old
-- INSERT policy bypass the current demo-user restriction.
drop policy if exists "Users can view group members" on public.group_members;
drop policy if exists "Users can join groups" on public.group_members;
drop policy if exists "Users can leave groups" on public.group_members;

-- Cache auth.uid() once per statement without changing the policy predicate.
alter policy arena_guest_claim_links_manager_select
  on public.arena_guest_claim_links
  to authenticated
  using (
    created_by = (select auth.uid())
    or public.is_admin((select auth.uid()))
  );

-- Fix deterministic name resolution for legacy trigger/auth helpers. Their
-- bodies and signatures remain unchanged, so existing V8 callers are stable.
alter function public.update_updated_at_column() set search_path = public, pg_temp;
alter function public.is_demo_user() set search_path = public, pg_temp;
alter function public.touch_live_game_updated_at() set search_path = public, pg_temp;

commit;
