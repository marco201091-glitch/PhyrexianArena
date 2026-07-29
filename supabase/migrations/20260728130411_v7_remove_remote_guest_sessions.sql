-- V7 removes unauthenticated remote guest sessions.
-- Arena guests stored in arena_guests / arena_guest_decks remain supported.

DROP TRIGGER IF EXISTS broadcast_guest_live_game_state_trigger
  ON public.live_games;

DROP TRIGGER IF EXISTS broadcast_public_counter_state_trigger
  ON public.public_counter_sessions;

DROP FUNCTION IF EXISTS private.broadcast_guest_live_game_state();
DROP FUNCTION IF EXISTS private.broadcast_public_counter_state();
DROP FUNCTION IF EXISTS public.apply_guest_live_game_state(text, integer, jsonb);
DROP FUNCTION IF EXISTS public.purge_finished_guest_sessions();

DROP TABLE IF EXISTS public.live_game_lobby_guests;
DROP TABLE IF EXISTS public.live_game_lobbies;
DROP TABLE IF EXISTS public.public_counter_guests;
DROP TABLE IF EXISTS public.public_counter_sessions;

NOTIFY pgrst, 'reload schema';
