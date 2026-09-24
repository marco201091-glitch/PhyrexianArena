export const colors = {
  black: '#000000',
  white: '#ffffff',
  background: '#070908',
  card: '#111312',
  cardElevated: '#151816',
  cardInset: '#0b0d0c',
  modalSurface: '#101311',
  modalOverlay: 'rgba(0, 0, 0, 0.88)',
  border: '#29312c',
  // One emerald accent family: panels, selections and actions use the same hue.
  borderAccent: '#35b94d',
  cardBorder: '#286b37',
  borderSoft: '#29312c',
  foreground: '#f3f7f4',
  muted: '#9ca69f',
  primary: '#4bdb63',
  primaryLight: '#78f58b',
  primaryMuted: '#a8f3b2',
  primaryDark: '#257a36',
  primaryAccent: 'rgba(69, 201, 91, 0.38)',
  primarySurface: '#0c2111',
  primaryForeground: '#f2fff4',
  teal: '#14b8a6',
  successSurface: '#101411',
  destructive: '#ef4444',
  destructiveSurface: 'rgba(239, 68, 68, 0.1)',
  destructiveBorder: 'rgba(239, 68, 68, 0.35)',
  success: '#6ee7b7',
  successBright: '#34d399',
  successBorder: '#14532d',
  amber: '#fbbf24',
  warningSurface: '#422006',
  warningBorder: 'rgba(251, 191, 36, 0.35)',
  info: '#38bdf8',
  infoMuted: '#7dd3fc',
  infoSurface: 'rgba(56, 189, 248, 0.12)',
  infoBorder: 'rgba(56, 189, 248, 0.3)',
  medalGold: '#fbbf24',
  overlay: 'rgba(0, 0, 0, 0.7)',
  overlayLight: 'rgba(2, 4, 3, 0.34)',
  overlayMid: 'rgba(2, 4, 3, 0.56)',
  overlayHeavy: 'rgba(2, 4, 3, 0.78)',
  inputBg: '#0a0c0b',
  surfaceMuted: '#0e110f',
  surfaceRaised: '#191c1a',
  surfaceChip: '#202522',
  surfaceTrack: '#202522',
  surfaceTrackMuted: '#171a18',
  buttonSecondary: '#070a08',
  buttonSecondaryBorder: '#31523a',
  artScrim: 'rgba(2, 4, 3, 0.72)',
  lifeSurface: '#211820',
  lifeBorder: '#54333f',
  lifeEmblem: '#39212e',
  selectionTint: 'rgba(69, 201, 91, 0.12)',
  selectionTintStrong: 'rgba(69, 201, 91, 0.2)',
  selectionBorder: 'rgba(110, 233, 130, 0.42)',
};

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
    shadowColor: '#4bdb63',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  panelStrong: {
    shadowColor: '#4bdb63',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 7,
    elevation: 3,
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

/**
 * Touch-target slop for controls drawn smaller than the platform minimum.
 *
 * iOS resolves a Pressable's `hitSlop` inside the parent's bounds, so a compact
 * control can borrow the missing area instead of being redesigned larger. A
 * 32pt chip gains 6pt on every side and accepts the same imprecise tap as a
 * 44pt button while looking unchanged.
 */
export function touchSlop(size: number, minimum: number = touch.minHeight) {
  const pad = Math.max(0, Math.ceil((minimum - size) / 2));
  return { top: pad, bottom: pad, left: pad, right: pad };
}
