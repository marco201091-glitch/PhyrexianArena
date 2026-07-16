export const layout = {
  compactWidth: 360,
  phoneWidth: 600,
  tabletWidth: 700,
  desktopWidth: 1024,
  contentMaxWidth: 960,
  formMaxWidth: 560,
  tabContentMaxWidth: 720,
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
  const viewportWidth = Math.min(width, layout.contentMaxWidth);
  return Math.max(0, viewportWidth - (padding + extraInset) * 2);
}

export function isCompactViewport(width: number): boolean {
  return width < layout.compactWidth;
}

export function isPhoneViewport(width: number): boolean {
  return width < layout.phoneWidth;
}

export function isTabletViewport(width: number): boolean {
  return width >= layout.tabletWidth;
}

export function responsiveGridColumns(
  viewportWidth: number,
  minimumColumnWidth: number,
  maximumColumns: number,
  gap = 12,
): number {
  if (maximumColumns <= 1 || minimumColumnWidth <= 0) return 1;
  const availableWidth = contentWidth(viewportWidth);
  const columns = Math.floor((availableWidth + gap) / (minimumColumnWidth + gap));
  return Math.max(1, Math.min(maximumColumns, columns));
}

export function screenContentMaxWidth(background: 'artwork' | 'solid'): number {
  return background === 'solid' ? layout.formMaxWidth : layout.contentMaxWidth;
}

export function tabBarHorizontalInset(width: number): number {
  return Math.max(0, Math.round((width - layout.tabContentMaxWidth) / 2));
}

/** Width for horizontal deck-picker cards (narrow enough to peek the next card). */
export function deckPickerCardWidth(screenWidth: number, outerInset = 32): number {
  const available = contentWidth(screenWidth, outerInset / 2);
  return Math.min(280, Math.max(200, Math.round(available * 0.72)));
}
