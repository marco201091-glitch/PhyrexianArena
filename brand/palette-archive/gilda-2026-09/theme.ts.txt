export const colors = {
  black: '#000000',
  white: '#ffffff',
  background: '#0b0d11',
  card: '#14171d',
  cardElevated: '#1b1f27',
  cardInset: '#101319',
  modalSurface: '#1b1f27',
  modalOverlay: 'rgba(0, 0, 0, 0.88)',
  border: '#262c38',
  // One emerald accent family: panels, selections and actions use the same hue.
  borderAccent: '#384150',
  cardBorder: '#262c38',
  borderSoft: '#262c38',
  foreground: '#f2ede0',
  muted: '#8a93a1',
  primary: '#d4af37',
  primaryLight: '#e8c860',
  primaryMuted: '#e8c860',
  primaryDark: '#9b7d22',
  primaryAccent: 'rgba(212, 175, 55, 0.18)',
  primarySurface: '#29230f',
  primaryForeground: '#1a1305',
  teal: '#14b8a6',
  successSurface: '#101411',
  destructive: '#d96a6a',
  destructiveSurface: 'rgba(217, 106, 106, 0.12)',
  destructiveBorder: 'rgba(217, 106, 106, 0.35)',
  success: '#5fb88a',
  successBright: '#5fb88a',
  successBorder: '#14532d',
  amber: '#e89b4c',
  warningSurface: '#422006',
  warningBorder: 'rgba(251, 191, 36, 0.35)',
  info: '#38bdf8',
  infoMuted: '#7dd3fc',
  infoSurface: 'rgba(56, 189, 248, 0.12)',
  infoBorder: 'rgba(56, 189, 248, 0.3)',
  medalGold: '#fbbf24',
  overlay: 'rgba(0, 0, 0, 0.7)',
  overlayLight: 'rgba(5, 6, 9, 0.34)',
  overlayMid: 'rgba(5, 6, 9, 0.56)',
  overlayHeavy: 'rgba(5, 6, 9, 0.78)',
  inputBg: '#14171d',
  surfaceMuted: '#14171d',
  surfaceRaised: '#1b1f27',
  surfaceChip: '#232833',
  surfaceTrack: '#232833',
  surfaceTrackMuted: '#1b1f27',
  buttonSecondary: '#0b0d11',
  buttonSecondaryBorder: '#384150',
  artScrim: 'rgba(5, 6, 9, 0.72)',
  lifeSurface: '#211820',
  lifeBorder: '#54333f',
  lifeEmblem: '#39212e',
  selectionTint: 'rgba(212, 175, 55, 0.12)',
  selectionTintStrong: 'rgba(212, 175, 55, 0.2)',
  selectionBorder: 'rgba(232, 200, 96, 0.44)',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 2,
  },
  panelStrong: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
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
