import { describe, expect, it } from 'vitest';
import {
  contentPadding,
  contentWidth,
  deckPickerCardWidth,
  layout,
  resolveSafeAreaEdges,
  resolveTabBarHeight,
  scaleForWidth,
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
});

describe('deckPickerCardWidth', () => {
  it('returns a card width that fits the available modal space', () => {
    const width = deckPickerCardWidth(390);
    expect(width).toBeGreaterThanOrEqual(220);
    expect(width).toBeLessThanOrEqual(300);
  });
});