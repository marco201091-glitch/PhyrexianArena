-- v7 retires every remote guest flow. Local Arena guests and their decks remain.
DROP FUNCTION IF EXISTS public.claim_arena_guest(text);
DROP TABLE IF EXISTS public.arena_guest_claim_links;
