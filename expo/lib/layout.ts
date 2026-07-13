export const layout = {
  compactWidth: 360,
  maxFontSizeMultiplier: 1.3,
  tabBarBaseHeight: 64,
  screenPaddingWide: 16,
  screenPaddingDefault: 14,
  screenPaddingCompact: 12,
} as const;

export type SafeAreaEdge = 'top' | 'left' | 'right' | 'bottom';

export function scaleForWidth(
  value: number,
  width: number,
  minWidth: number = layout.compactWidth,
): number {
  if (width >= minWidth) return value;
  const ratio = Math.max(0.82, width / minWidth);
  return Math.round(value * ratio);
}

export function resolveSafeAreaEdges(safeBottom: boolean): SafeAreaEdge[] {
  return safeBottom ? ['top', 'left', 'right', 'bottom'] : ['top', 'left', 'right'];
}

export function resolveTabBarHeight(bottomInset: number): number {
  return layout.tabBarBaseHeight + bottomInset;
}

export function contentPadding(width: number): number {
  if (width >= 400) return layout.screenPaddingWide;
  if (width >= layout.compactWidth) return layout.screenPaddingDefault;
  return layout.screenPaddingCompact;
}

export function contentWidth(width: number, extraInset = 0): number {
  const padding = contentPadding(width);
  return Math.max(0, width - (padding + extraInset) * 2);
}

/** Width for horizontal deck-picker cards (narrow enough to peek the next card). */
export function deckPickerCardWidth(screenWidth: number, outerInset = 32): number {
  const available = contentWidth(screenWidth, outerInset / 2);
  return Math.min(280, Math.max(200, Math.round(available * 0.72)));
}