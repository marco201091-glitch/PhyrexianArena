/**
 * Remote guests are intentionally disabled in every app surface.
 *
 * Keep the implementation and database schema in place for a possible future
 * redesign, but never expose join links or accept remote-guest API traffic.
 */
export const REMOTE_GUESTS_ENABLED: boolean = false;
