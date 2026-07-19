/**
 * Remote guests are intentionally disabled on Android and iOS.
 *
 * Code stays recoverable for a future redesign; UI and network flows must
 * remain gated by this flag.
 */
export const REMOTE_GUESTS_ENABLED: boolean = false;
