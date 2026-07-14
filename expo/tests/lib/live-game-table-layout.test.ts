import { describe, expect, it } from 'vitest';
import {
  CENTER_TOOLBAR_HEIGHT,
  findPodAtPoint,
  fitCommanderArtFrame,
  getBottomToolbarHeight,
  getCenterToolbarBand,
  getCommanderCardAnchor,
  getSeatRotation,
  getSquareTableLayouts,
  getTableOrientation,
  mapPlayersToSeats,
  usesCenterToolbar,
} from '@/lib/live-game-table-layout';

describe('live-game-table-layout', () => {
  it('uses portrait grids for all player counts', () => {
    expect(getTableOrientation(2)).toBe('portrait');
    expect(getTableOrientation(4)).toBe('portrait');
    expect(getTableOrientation(6)).toBe('portrait');
  });

  it('reserves a horizontal center toolbar for two-to-six-player games', () => {
    expect(usesCenterToolbar(4)).toBe(true);
    expect(usesCenterToolbar(3)).toBe(true);
    expect(usesCenterToolbar(5)).toBe(true);
    expect(usesCenterToolbar(6)).toBe(true);
    expect(usesCenterToolbar(2)).toBe(true);
    expect(getBottomToolbarHeight(4, 20)).toBe(0);
    expect(getBottomToolbarHeight(3, 20)).toBe(0);
    expect(getBottomToolbarHeight(2, 20)).toBe(0);
  });

  it('lays out four players around a horizontal center toolbar band', () => {
    const layouts = getSquareTableLayouts(4, 390, 780);
    expect(layouts).toHaveLength(4);
    expect(layouts[0]?.role).toBe('topLeft');
    expect(layouts[3]?.role).toBe('bottomRight');

    const topLeft = layouts[0]!;
    const topRight = layouts[1]!;
    const bottomLeft = layouts[2]!;

    const toolbar = getCenterToolbarBand(4, 390, 780);
    expect(toolbar?.height).toBe(CENTER_TOOLBAR_HEIGHT);
    expect(toolbar?.top).toBe(topLeft.top + topLeft.height);
    expect(bottomLeft.top - toolbar!.top).toBe(CENTER_TOOLBAR_HEIGHT);
    expect(topRight.left - (topLeft.left + topLeft.width)).toBeGreaterThan(0);
  });

  it('lays out two players around the center toolbar', () => {
    const layouts = getSquareTableLayouts(2, 390, 780);
    expect(layouts).toHaveLength(2);
    expect(layouts[0]?.role).toBe('top');
    expect(layouts[1]?.role).toBe('bottom');
    const toolbar = getCenterToolbarBand(2, 390, 780)!;
    expect(toolbar.top).toBe(layouts[0]!.top + layouts[0]!.height);
    expect(layouts[1]!.top).toBe(toolbar.top + toolbar.height);
  });

  it('rotates four-player side seats outward away from the table center', () => {
    expect(getSeatRotation('topLeft', 4)).toBe(90);
    expect(getSeatRotation('bottomLeft', 4)).toBe(90);
    expect(getSeatRotation('topRight', 4)).toBe(-90);
    expect(getSeatRotation('bottomRight', 4)).toBe(-90);
  });

  it('rotates three-player seats toward each seated player', () => {
    expect(getSeatRotation('topLeft', 3)).toBe(90);
    expect(getSeatRotation('topRight', 3)).toBe(-90);
    expect(getSeatRotation('bottom', 3)).toBe(0);
    expect(getSeatRotation('bottom', 2)).toBe(0);
    expect(getSeatRotation('top', 2)).toBe(180);
    expect(getCommanderCardAnchor('bottomRight')).toBe('topRight');
  });

  it('keeps the five-player head seat and flips every other five/six-player seat', () => {
    expect(getSeatRotation('capotavola', 5)).toBe(90);
    expect(getSeatRotation('topLeft', 5)).toBe(-90);
    expect(getSeatRotation('topRight', 5)).toBe(-90);
    expect(getSeatRotation('bottom', 5)).toBe(180);
    expect(getSeatRotation('capotavola', 6)).toBe(90);
    expect(getSeatRotation('top', 6)).toBe(-90);
    expect(getSeatRotation('bottomLeft', 6)).toBe(90);
    expect(getSeatRotation('bottomRight', 6)).toBe(-90);
  });

  it('uses a 2+1, 4+1, and 4+2 split around the toolbar', () => {
    const three = getSquareTableLayouts(3, 390, 780);
    const five = getSquareTableLayouts(5, 390, 780);
    const six = getSquareTableLayouts(6, 390, 780);

    expect(three.map((layout) => layout.role)).toEqual(['topLeft', 'topRight', 'bottom']);
    expect(three[2]?.width).toBeGreaterThan(three[0]!.width);
    expect(five).toHaveLength(5);
    expect(five[4]?.role).toBe('bottom');
    expect(five[4]?.width).toBeGreaterThan(five[0]!.width);
    expect(six).toHaveLength(6);
    expect(six[4]?.role).toBe('bottomLeft');
    expect(six[5]?.role).toBe('bottomRight');

    [three, five, six].forEach((layouts) => {
      const band = getCenterToolbarBand(layouts.length, 390, 780)!;
      layouts.forEach((layout) => {
        const overlapsToolbar = layout.top < band.top + band.height
          && layout.top + layout.height > band.top;
        expect(overlapsToolbar).toBe(false);
      });
    });
  });

  it('offers an alternate table preset without overlapping the toolbar', () => {
    [2, 3, 4, 5, 6].forEach((count) => {
      const layouts = getSquareTableLayouts(count, 390, 780, 'opposed');
      const band = getCenterToolbarBand(count, 390, 780, 'opposed')!;
      expect(layouts).toHaveLength(count);
      layouts.forEach((layout) => {
        const overlapsToolbar = layout.top < band.top + band.height
          && layout.top + layout.height > band.top;
        expect(overlapsToolbar).toBe(false);
      });
    });
    expect(getSquareTableLayouts(3, 390, 780, 'opposed').map((seat) => seat.role))
      .toEqual(['top', 'bottomLeft', 'bottomRight']);
  });

  it('orients alternate-preset seats toward the relevant outside edge', () => {
    expect(getSeatRotation('top', 5, 'opposed')).toBe(180);
    expect(getSeatRotation('capotavola', 6, 'opposed')).toBe(180);
    expect(getSeatRotation('bottom', 4, 'opposed')).toBe(0);
    expect(getSeatRotation('bottomLeft', 5, 'opposed')).toBe(90);
    expect(getSeatRotation('bottomRight', 5, 'opposed')).toBe(-90);
  });

  it('anchors the viewer at the bottom for duels and bottom-right in four-player games', () => {
    const twoLayouts = getSquareTableLayouts(2, 390, 780);
    const twoPlayers = [
      { slot: 0, participantKey: 'user:a' },
      { slot: 1, participantKey: 'user:b' },
    ];
    const twoSeat = mapPlayersToSeats(twoPlayers, twoLayouts, 'user:b');
    expect(twoSeat.find((entry) => entry.player.participantKey === 'user:b')?.layout.role).toBe('bottom');

    const fourLayouts = getSquareTableLayouts(4, 390, 780);
    const fourPlayers = [
      { slot: 0, participantKey: 'user:a' },
      { slot: 1, participantKey: 'user:b' },
      { slot: 2, participantKey: 'user:c' },
      { slot: 3, participantKey: 'user:d' },
    ];
    const fourSeat = mapPlayersToSeats(fourPlayers, fourLayouts, 'user:b');
    expect(fourSeat.find((entry) => entry.player.participantKey === 'user:b')?.layout.role).toBe('bottomRight');
  });

  it('fits commander art inside the seat without stretching the seat bounds', () => {
    const tallSeat = fitCommanderArtFrame(180, 320);
    expect(tallSeat.width).toBeGreaterThan(140);
    expect(tallSeat.height).toBeLessThanOrEqual(Math.round(320 * 0.86));
    expect(tallSeat.width / tallSeat.height).toBeCloseTo(5 / 7, 2);

    const wideSeat = fitCommanderArtFrame(320, 180);
    expect(wideSeat.height).toBeGreaterThan(130);
    expect(wideSeat.width).toBeLessThanOrEqual(Math.round(320 * 0.86));
  });

  it('finds the pod under a drop point', () => {
    const bounds = {
      'user:a': { x: 10, y: 20, width: 100, height: 120 },
      'user:b': { x: 140, y: 20, width: 100, height: 120 },
    };
    expect(findPodAtPoint(bounds, 50, 60)).toBe('user:a');
    expect(findPodAtPoint(bounds, 190, 60)).toBe('user:b');
    expect(findPodAtPoint(bounds, 50, 60, 'user:a')).toBeNull();
    expect(findPodAtPoint(bounds, 190, 60, 'user:b')).toBeNull();
  });
});
