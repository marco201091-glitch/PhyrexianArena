import { describe, expect, it } from 'vitest';
import {
  contentPadding,
  contentWidth,
  deckPickerCardWidth,
  layout,
  isCompactViewport,
  isIPadViewport,
  isPhoneViewport,
  isTabletViewport,
  resolveSafeAreaEdges,
  resolveTabBarHeight,
  responsiveGridColumns,
  scaleForWidth,
  screenContentMaxWidth,
  tabBarHorizontalInset,
} from '@/lib/layout';

describe('scaleForWidth', () => {
  it('returns the original value on wide screens', () => {
    expect(scaleForWidth(236, 400)).toBe(236);
  });

  it('scales down on compact screens', () => {
    expect(scaleForWidth(236, 320)).toBe(210);
  });

  it('does not shrink below 82% of the original value', () => {
    expect(scaleForWidth(100, layout.compactWidth)).toBe(100);
    expect(scaleForWidth(100, 100)).toBe(82);
  });
});

describe('resolveSafeAreaEdges', () => {
  it('omits bottom inset for tab screens', () => {
    expect(resolveSafeAreaEdges(false)).toEqual(['top', 'left', 'right']);
  });

  it('includes bottom inset for full-screen stack screens', () => {
    expect(resolveSafeAreaEdges(true)).toEqual(['top', 'left', 'right', 'bottom']);
  });
});

describe('resolveTabBarHeight', () => {
  it('adds the gesture navigation inset to the base height', () => {
    expect(resolveTabBarHeight(24)).toBe(layout.tabBarBaseHeight + 24);
  });
});

describe('contentPadding', () => {
  it('uses the widest padding on large phones', () => {
    expect(contentPadding(420)).toBe(layout.screenPaddingWide);
  });

  it('tightens padding on compact phones', () => {
    expect(contentPadding(320)).toBe(layout.screenPaddingCompact);
  });
});

describe('contentWidth', () => {
  it('subtracts horizontal padding from the screen width', () => {
    expect(contentWidth(400)).toBe(400 - layout.screenPaddingWide * 2);
  });

  it('caps content on wide tablets and desktop browsers', () => {
    expect(contentWidth(1366)).toBe(layout.contentMaxWidth - layout.screenPaddingWide * 2);
  });
});

describe('responsive breakpoints', () => {
  it('classifies compact phones, phones and tablets predictably', () => {
    expect(isCompactViewport(320)).toBe(true);
    expect(isCompactViewport(390)).toBe(false);
    expect(isPhoneViewport(599)).toBe(true);
    expect(isPhoneViewport(600)).toBe(false);
    expect(isTabletViewport(699)).toBe(false);
    expect(isTabletViewport(700)).toBe(true);
  });

  it('enables expanded controls only on full-size iOS tablets', () => {
    expect(isIPadViewport('ios', 1024, 768)).toBe(true);
    expect(isIPadViewport('ios', 768, 1024)).toBe(true);
    expect(isIPadViewport('ios', 932, 430)).toBe(false);
    expect(isIPadViewport('android', 1024, 768)).toBe(false);
  });

  it('constrains forms and centers wide tab content', () => {
    expect(screenContentMaxWidth('solid')).toBe(layout.formMaxWidth);
    expect(screenContentMaxWidth('artwork')).toBe(layout.contentMaxWidth);
    expect(tabBarHorizontalInset(720)).toBe(0);
    expect(tabBarHorizontalInset(1024)).toBe(152);
  });
});

describe('responsiveGridColumns', () => {
  it('uses native tablet density on full-size iPads', () => {
    expect(responsiveGridColumns(768, 340, 2, 14)).toBe(2);
    expect(responsiveGridColumns(1024, 290, 3, 12)).toBe(3);
    expect(responsiveGridColumns(1366, 290, 3, 12)).toBe(3);
  });

  it('collapses cleanly in iPad Split View instead of scaling the UI', () => {
    expect(responsiveGridColumns(507, 340, 2, 14)).toBe(1);
    expect(responsiveGridColumns(375, 290, 3, 12)).toBe(1);
  });

  it('always returns a safe column count for invalid limits', () => {
    expect(responsiveGridColumns(1024, 290, 1)).toBe(1);
    expect(responsiveGridColumns(1024, 0, 3)).toBe(1);
  });
});

describe('deckPickerCardWidth', () => {
  it('returns a card width that fits the available modal space', () => {
    const width = deckPickerCardWidth(390);
    expect(width).toBeGreaterThanOrEqual(220);
    expect(width).toBeLessThanOrEqual(300);
  });
});
