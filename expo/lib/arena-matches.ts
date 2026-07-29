/** Bounded history page. Permanent match storage itself has no cap. */
export const ARENA_MATCHES_PAGE_SIZE = 100;

/** Only the recent page is kept in the device snapshot cache. */
export const ARENA_MATCH_CACHE_LIMIT = ARENA_MATCHES_PAGE_SIZE;

/** Backward-compatible alias for v6 imports. */
export const ARENA_MATCHES_FETCH_LIMIT = ARENA_MATCHES_PAGE_SIZE;
