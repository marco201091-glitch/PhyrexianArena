import { setStatusBarHidden } from 'expo-status-bar';

/** Hide only the status bar during live play (navigation bar stays visible). */
export function applyLiveGameImmersive(): void {
  setStatusBarHidden(true, 'fade');
}

/** Restore the status bar when leaving live play or the play screen. */
export function clearLiveGameImmersive(): void {
  setStatusBarHidden(false, 'fade');
}