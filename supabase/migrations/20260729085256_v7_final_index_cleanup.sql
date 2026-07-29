-- The unique constraint already provides an equivalent btree index.
DROP INDEX IF EXISTS public.idx_groups_invite_code;

-- Cover the only application-owned foreign key reported without a supporting index.
CREATE INDEX IF NOT EXISTS arena_guest_claim_links_created_by_idx
  ON public.arena_guest_claim_links(created_by);
