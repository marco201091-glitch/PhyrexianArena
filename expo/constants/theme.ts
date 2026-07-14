export const colors = {
  black: '#000000',
  white: '#ffffff',
  background: '#0a0a0f',
  card: '#12121a',
  cardElevated: '#14141f',
  cardInset: '#0c0c14',
  modalSurface: '#10101a',
  modalOverlay: 'rgba(0, 0, 0, 0.88)',
  border: '#2a2a3a',
  borderViolet: '#3b2d5c',
  borderSoft: '#2a2a3a',
  foreground: '#f4f4f5',
  muted: '#a1a1aa',
  primary: '#7c3aed',
  primaryLight: '#a78bfa',
  primaryMuted: '#c4b5fd',
  primaryDark: '#5b21b6',
  primarySurface: '#2e1065',
  primaryForeground: '#ede9fe',
  teal: '#14b8a6',
  tealMuted: '#0f1a18',
  violetGlow: '#1a1428',
  destructive: '#ef4444',
  success: '#6ee7b7',
  successBright: '#34d399',
  successBorder: '#14532d',
  amber: '#fbbf24',
  warningSurface: '#422006',
  overlay: 'rgba(0, 0, 0, 0.7)',
  overlayLight: 'rgba(4, 4, 7, 0.34)',
  overlayMid: 'rgba(4, 4, 7, 0.56)',
  overlayHeavy: 'rgba(4, 4, 7, 0.78)',
  inputBg: '#0c0c14',
  surfaceMuted: '#0f0f18',
  surfaceRaised: '#111118',
  surfaceChip: '#1f1f2b',
  surfaceTrack: '#1f1f2e',
  surfaceTrackMuted: '#18181f',
  selectionTint: 'rgba(124, 58, 237, 0.16)',
  selectionTintStrong: 'rgba(124, 58, 237, 0.25)',
  selectionBorder: 'rgba(124, 58, 237, 0.35)',
};

/**
 * Focal point for app-background.png.
 * Adjust when replacing the asset (e.g. mobile crop centered on the tower).
 */
export const backgroundArt = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

/** Gap between sibling cards in a horizontal row (stat tiles, paired panels). */
export const cardRowGap = spacing.md;

/** Vertical gap between stacked sections on a screen. */
export const sectionStackGap = spacing.lg;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const shadows = {
  panel: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.32,
    shadowRadius: 30,
    elevation: 12,
  },
  panelStrong: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 0.42,
    shadowRadius: 40,
    elevation: 16,
  },
  modal: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 28 },
    shadowOpacity: 0.55,
    shadowRadius: 48,
    elevation: 24,
  },
  cardArt: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 6,
  },
} as const;

export const typography = {
  hero: { fontSize: 28, fontWeight: '700' as const, lineHeight: 34 },
  title: { fontSize: 22, fontWeight: '700' as const, lineHeight: 28 },
  subtitle: { fontSize: 16, fontWeight: '600' as const, lineHeight: 22 },
  body: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: '500' as const, lineHeight: 16 },
  label: {
    fontSize: 11,
    fontWeight: '600' as const,
    lineHeight: 14,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
} as const;

/** MTG card art aspect ratio (width : height = 5 : 7). */
export const cardArt = {
  ratio: 5 / 7,
  sizes: {
    xs: { width: 36, height: 50 },
    sm: { width: 48, height: 67 },
    md: { width: 64, height: 90 },
    lg: { width: 72, height: 101 },
    hero: { width: 88, height: 123 },
  },
} as const;

export const touch = {
  minHeight: 44,
  minWidth: 44,
} as const;