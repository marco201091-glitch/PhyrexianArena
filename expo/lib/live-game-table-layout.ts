export type PodBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type SeatRole =
  | 'capotavola'
  | 'top'
  | 'topLeft'
  | 'topRight'
  | 'bottom'
  | 'bottomLeft'
  | 'bottomRight';

export type TableOrientation = 'portrait' | 'landscape';
export type TableLayoutVariant = 'classic' | 'opposed';

export type SquareSeatLayout = {
  left: number;
  top: number;
  width: number;
  height: number;
  role: SeatRole;
};

const GRID_PADDING = 4;
const GRID_GAP = 2;
/** Tool strip between the two sides of the table. */
export const CENTER_TOOLBAR_HEIGHT = 48;
export const CENTER_TOOLBAR_WIDTH = 56;

export type CenterToolbarBand = {
  left: number;
  top: number;
  width: number;
  height: number;
  axis: 'horizontal' | 'vertical';
};

/** MTG card width:height — used to frame commander art in live seats. */
export const COMMANDER_CARD_ART_RATIO = 5 / 7;

export function fitCommanderArtFrame(
  seatWidth: number,
  seatHeight: number,
  inset = 0.07,
): { width: number; height: number } {
  if (!seatWidth || !seatHeight) return { width: 0, height: 0 };

  const availW = seatWidth * (1 - inset * 2);
  const availH = seatHeight * (1 - inset * 2);

  let width = availW;
  let height = width / COMMANDER_CARD_ART_RATIO;
  if (height > availH) {
    height = availH;
    width = height * COMMANDER_CARD_ART_RATIO;
  }

  return {
    width: Math.round(width),
    height: Math.round(height),
  };
}

export function getTableOrientation(_playerCount: number): TableOrientation {
  return 'portrait';
}

/** Web/tablet layouts can rotate even when the native game remains portrait-locked. */
export function getViewportTableOrientation(width: number, height: number): TableOrientation {
  return width > height ? 'landscape' : 'portrait';
}

export function usesCenterToolbar(playerCount: number): boolean {
  return playerCount >= 2 && playerCount <= 6;
}

export function getBottomToolbarHeight(playerCount: number, bottomSafeInset: number): number {
  if (usesCenterToolbar(playerCount)) return 0;
  return 56 + Math.max(bottomSafeInset, 8);
}

export type EdgeControl = 'topLeft' | 'topCenter' | 'topRight' | 'bottomLeft' | 'bottomCenter' | 'bottomRight';

export type SeatControlPlacement = {
  plus: EdgeControl;
  minus: EdgeControl;
  nameSide: 'left' | 'right';
};

/** Rotate seat UI so life totals face the seated player. */
export function getSeatRotation(
  role: SeatRole,
  playerCount: number,
  variant: TableLayoutVariant = 'classic',
): number {
  if (variant === 'opposed') {
    if (role === 'top' || role === 'capotavola') return 180;
    if (role === 'topLeft' || role === 'bottomLeft') return 90;
    if (role === 'topRight' || role === 'bottomRight') return -90;
    return 0;
  }
  if (playerCount === 3) {
    switch (role) {
      case 'topLeft':
        return 90;
      case 'topRight':
        return -90;
      default:
        return 0;
    }
  }

  if (playerCount === 2) {
    return role === 'top' ? 180 : 0;
  }

  // Phone flat at table center, portrait locked: left column faces west, right column faces east.
  if (playerCount === 4) {
    switch (role) {
      case 'topLeft':
      case 'bottomLeft':
        return 90;
      case 'topRight':
      case 'bottomRight':
        return -90;
      default:
        return 180;
    }
  }

  if (playerCount === 5) {
    switch (role) {
      case 'capotavola':
      case 'topLeft':
      case 'bottomLeft':
        return 90;
      case 'topRight':
      case 'top':
      case 'bottomRight':
        return -90;
      case 'bottom':
        return 0;
      default:
        return 180;
    }
  }

  if (playerCount === 6) {
    switch (role) {
      case 'topLeft':
      case 'capotavola':
      case 'bottomLeft':
        return 90;
      case 'topRight':
      case 'top':
      case 'bottomRight':
        return -90;
      default:
        return 180;
    }
  }

  switch (role) {
    case 'capotavola':
    case 'top':
    case 'topLeft':
    case 'topRight':
      return 180;
    default:
      return 0;
  }
}

export function getSeatControlPlacement(role: SeatRole): SeatControlPlacement {
  switch (role) {
    case 'topLeft':
      return { plus: 'bottomRight', minus: 'topLeft', nameSide: 'left' };
    case 'topRight':
      return { plus: 'bottomLeft', minus: 'topRight', nameSide: 'right' };
    case 'bottomLeft':
      return { plus: 'topRight', minus: 'bottomLeft', nameSide: 'left' };
    case 'bottomRight':
      return { plus: 'topLeft', minus: 'bottomRight', nameSide: 'right' };
    case 'top':
    case 'capotavola':
      return { plus: 'bottomCenter', minus: 'topCenter', nameSide: 'right' };
    default:
      return { plus: 'bottomCenter', minus: 'topCenter', nameSide: 'left' };
  }
}

function edgeControlStyle(edge: EdgeControl) {
  const inset = 8;
  const centered = { marginLeft: -26, left: '50%' as const };
  switch (edge) {
    case 'topLeft':
      return { top: inset, left: inset };
    case 'topCenter':
      return { top: inset, ...centered };
    case 'topRight':
      return { top: inset, right: inset };
    case 'bottomLeft':
      return { bottom: inset, left: inset };
    case 'bottomCenter':
      return { bottom: inset, ...centered };
    default:
      return { bottom: inset, right: inset };
  }
}

export function getEdgeControlStyle(edge: EdgeControl) {
  return edgeControlStyle(edge);
}

export type CommanderCardAnchor = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' | 'topCenter';

export function getCommanderCardAnchor(role: SeatRole): CommanderCardAnchor {
  switch (role) {
    case 'topLeft':
    case 'bottomLeft':
      return 'topLeft';
    case 'topRight':
    case 'bottomRight':
      return 'topRight';
    case 'capotavola':
    case 'top':
      return 'topCenter';
    default:
      return 'topRight';
  }
}

export function findPodAtPoint(
  boundsByKey: Record<string, PodBounds | undefined>,
  x: number,
  y: number,
  excludeKey?: string,
): string | null {
  for (const [key, bounds] of Object.entries(boundsByKey)) {
    if (!bounds || key === excludeKey) continue;
    const right = bounds.x + bounds.width;
    const bottom = bounds.y + bounds.height;
    if (x >= bounds.x && x <= right && y >= bounds.y && y <= bottom) {
      return key;
    }
  }
  return null;
}

function layoutCell(
  left: number,
  top: number,
  width: number,
  height: number,
  role: SeatRole,
): SquareSeatLayout {
  return { left, top, width, height, role };
}

function gridCell(
  col: number,
  row: number,
  cols: number,
  rows: number,
  innerLeft: number,
  innerTop: number,
  cellW: number,
  cellH: number,
  role: SeatRole,
): SquareSeatLayout {
  return layoutCell(
    innerLeft + col * (cellW + GRID_GAP),
    innerTop + row * (cellH + GRID_GAP),
    cellW,
    cellH,
    role,
  );
}

function buildGrid(
  cols: number,
  rows: number,
  width: number,
  height: number,
  roleAt: (col: number, row: number) => SeatRole,
): SquareSeatLayout[] {
  const innerLeft = GRID_PADDING;
  const innerTop = GRID_PADDING;
  const innerW = width - GRID_PADDING * 2;
  const innerH = height - GRID_PADDING * 2;
  const cellW = (innerW - GRID_GAP * (cols - 1)) / cols;
  const cellH = (innerH - GRID_GAP * (rows - 1)) / rows;
  const layouts: SquareSeatLayout[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      layouts.push(gridCell(col, row, cols, rows, innerLeft, innerTop, cellW, cellH, roleAt(col, row)));
    }
  }

  return layouts;
}

function centerTableMetrics(
  playerCount: number,
  width: number,
  height: number,
  variant: TableLayoutVariant = 'classic',
) {
  const innerLeft = GRID_PADDING;
  const innerTop = GRID_PADDING;
  const innerW = width - GRID_PADDING * 2;
  const innerH = height - GRID_PADDING * 2;
  const cellW = (innerW - GRID_GAP) / 2;
  const availableH = innerH - CENTER_TOOLBAR_HEIGHT;
  const topRatio = variant === 'opposed'
    ? playerCount === 5 ? 0.66 : playerCount === 4 ? 0.34 : 0.5
    : playerCount >= 5 ? 0.64 : 0.5;
  const topH = Math.round(availableH * topRatio);
  const bottomH = availableH - topH;

  return { innerLeft, innerTop, innerW, cellW, topH, bottomH };
}

export function getCenterToolbarBand(
  playerCount: number,
  width: number,
  height: number,
  variant: TableLayoutVariant = 'classic',
): CenterToolbarBand | null {
  if (!usesCenterToolbar(playerCount)) return null;

  if (playerCount === 2 && variant === 'opposed') {
    const innerHeight = height - GRID_PADDING * 2;
    const innerWidth = width - GRID_PADDING * 2;
    return {
      left: GRID_PADDING + (innerWidth - CENTER_TOOLBAR_WIDTH) / 2,
      top: GRID_PADDING,
      width: CENTER_TOOLBAR_WIDTH,
      height: innerHeight,
      axis: 'vertical',
    };
  }

  const { innerLeft, innerTop, innerW, topH } = centerTableMetrics(playerCount, width, height, variant);
  return {
    left: innerLeft,
    top: innerTop + topH,
    width: innerW,
    height: CENTER_TOOLBAR_HEIGHT,
    axis: 'horizontal',
  };
}

function buildClassicTable(playerCount: number, width: number, height: number): SquareSeatLayout[] {
  const { innerLeft, innerTop, innerW, cellW, topH, bottomH } = centerTableMetrics(
    playerCount,
    width,
    height,
  );
  const bottomTop = innerTop + topH + CENTER_TOOLBAR_HEIGHT;

  if (playerCount === 2) {
    return [
      layoutCell(innerLeft, innerTop, innerW, topH, 'top'),
      layoutCell(innerLeft, bottomTop, innerW, bottomH, 'bottom'),
    ];
  }

  if (playerCount === 3) {
    return [
      layoutCell(innerLeft, innerTop, cellW, topH, 'topLeft'),
      layoutCell(innerLeft + cellW + GRID_GAP, innerTop, cellW, topH, 'topRight'),
      layoutCell(innerLeft, bottomTop, innerW, bottomH, 'bottom'),
    ];
  }

  if (playerCount === 4) {
    return [
      layoutCell(innerLeft, innerTop, cellW, topH, 'topLeft'),
      layoutCell(innerLeft + cellW + GRID_GAP, innerTop, cellW, topH, 'topRight'),
      layoutCell(innerLeft, bottomTop, cellW, bottomH, 'bottomLeft'),
      layoutCell(innerLeft + cellW + GRID_GAP, bottomTop, cellW, bottomH, 'bottomRight'),
    ];
  }

  const upperCellH = (topH - GRID_GAP) / 2;
  const upperSeats = [
    layoutCell(innerLeft, innerTop, cellW, upperCellH, 'topLeft'),
    layoutCell(innerLeft + cellW + GRID_GAP, innerTop, cellW, upperCellH, 'topRight'),
    layoutCell(innerLeft, innerTop + upperCellH + GRID_GAP, cellW, upperCellH, 'capotavola'),
    layoutCell(innerLeft + cellW + GRID_GAP, innerTop + upperCellH + GRID_GAP, cellW, upperCellH, 'top'),
  ];

  if (playerCount === 5) {
    return [
      ...upperSeats,
      layoutCell(innerLeft, bottomTop, innerW, bottomH, 'bottom'),
    ];
  }

  return [
    ...upperSeats,
    layoutCell(innerLeft, bottomTop, cellW, bottomH, 'bottomLeft'),
    layoutCell(innerLeft + cellW + GRID_GAP, bottomTop, cellW, bottomH, 'bottomRight'),
  ];
}

function buildOpposedTable(playerCount: number, width: number, height: number): SquareSeatLayout[] {
  if (playerCount === 2) {
    const innerLeft = GRID_PADDING;
    const innerTop = GRID_PADDING;
    const innerW = width - GRID_PADDING * 2;
    const innerH = height - GRID_PADDING * 2;
    const seatW = (innerW - CENTER_TOOLBAR_WIDTH) / 2;
    return [
      layoutCell(innerLeft, innerTop, seatW, innerH, 'topLeft'),
      layoutCell(innerLeft + seatW + CENTER_TOOLBAR_WIDTH, innerTop, seatW, innerH, 'topRight'),
    ];
  }
  const { innerLeft, innerTop, innerW, cellW, topH, bottomH } = centerTableMetrics(
    playerCount,
    width,
    height,
    'opposed',
  );
  const bottomTop = innerTop + topH + CENTER_TOOLBAR_HEIGHT;

  if (playerCount === 3) {
    return [
      layoutCell(innerLeft, innerTop, innerW, topH, 'top'),
      layoutCell(innerLeft, bottomTop, cellW, bottomH, 'bottomLeft'),
      layoutCell(innerLeft + cellW + GRID_GAP, bottomTop, cellW, bottomH, 'bottomRight'),
    ];
  }

  if (playerCount === 4) {
    const lowerRowH = (bottomH - GRID_GAP) / 2;
    return [
      layoutCell(innerLeft, innerTop, innerW, topH, 'capotavola'),
      layoutCell(innerLeft, bottomTop, cellW, lowerRowH, 'bottomLeft'),
      layoutCell(innerLeft + cellW + GRID_GAP, bottomTop, cellW, lowerRowH, 'bottomRight'),
      layoutCell(innerLeft, bottomTop + lowerRowH + GRID_GAP, innerW, lowerRowH, 'bottom'),
    ];
  }

  if (playerCount === 5) {
    const upperRowH = (topH - GRID_GAP) / 2;
    return [
      layoutCell(innerLeft, innerTop, innerW, upperRowH, 'top'),
      layoutCell(innerLeft, innerTop + upperRowH + GRID_GAP, cellW, upperRowH, 'topLeft'),
      layoutCell(innerLeft + cellW + GRID_GAP, innerTop + upperRowH + GRID_GAP, cellW, upperRowH, 'topRight'),
      layoutCell(innerLeft, bottomTop, cellW, bottomH, 'bottomLeft'),
      layoutCell(innerLeft + cellW + GRID_GAP, bottomTop, cellW, bottomH, 'bottomRight'),
    ];
  }

  const upperRowH = (topH - GRID_GAP) / 2;
  const lowerRowH = (bottomH - GRID_GAP) / 2;
  return [
    layoutCell(innerLeft, innerTop, innerW, upperRowH, 'top'),
    layoutCell(innerLeft, innerTop + upperRowH + GRID_GAP, cellW, upperRowH, 'topLeft'),
    layoutCell(innerLeft + cellW + GRID_GAP, innerTop + upperRowH + GRID_GAP, cellW, upperRowH, 'topRight'),
    layoutCell(innerLeft, bottomTop, cellW, lowerRowH, 'bottomLeft'),
    layoutCell(innerLeft + cellW + GRID_GAP, bottomTop, cellW, lowerRowH, 'bottomRight'),
    layoutCell(innerLeft, bottomTop + lowerRowH + GRID_GAP, innerW, lowerRowH, 'bottom'),
  ];
}

function buildLandscapeColumn(
  left: number,
  top: number,
  width: number,
  height: number,
  roles: SeatRole[],
): SquareSeatLayout[] {
  const cellHeight = (height - GRID_GAP * (roles.length - 1)) / roles.length;
  return roles.map((role, index) => layoutCell(
    left,
    top + index * (cellHeight + GRID_GAP),
    width,
    cellHeight,
    role,
  ));
}

function buildLandscapeTable(
  playerCount: number,
  width: number,
  height: number,
  variant: TableLayoutVariant,
): SquareSeatLayout[] {
  const innerLeft = GRID_PADDING;
  const innerTop = GRID_PADDING;
  const innerWidth = width - GRID_PADDING * 2;
  const innerHeight = height - GRID_PADDING * 2;
  const columnWidth = (innerWidth - GRID_GAP) / 2;
  const right = innerLeft + columnWidth + GRID_GAP;

  if (playerCount === 2) {
    return [
      layoutCell(innerLeft, innerTop, columnWidth, innerHeight, 'top'),
      layoutCell(right, innerTop, columnWidth, innerHeight, 'bottom'),
    ];
  }

  const leftRoles: SeatRole[] = playerCount === 3
    ? variant === 'opposed' ? ['bottomLeft', 'bottomRight'] : ['bottom']
    : playerCount === 4
      ? ['topLeft', 'bottomLeft']
      : playerCount === 5
        ? variant === 'opposed'
          ? ['topLeft', 'capotavola', 'bottomLeft']
          : ['topLeft', 'bottomLeft']
        : ['topLeft', 'capotavola', 'bottomLeft'];
  const rightRoles: SeatRole[] = playerCount === 3
    ? variant === 'opposed' ? ['top'] : ['topLeft', 'topRight']
    : playerCount === 4
      ? ['topRight', 'bottomRight']
      : playerCount === 5
        ? variant === 'opposed'
          ? ['topRight', 'bottomRight']
          : ['topRight', 'top', 'bottomRight']
        : ['topRight', 'top', 'bottomRight'];

  return [
    ...buildLandscapeColumn(innerLeft, innerTop, columnWidth, innerHeight, leftRoles),
    ...buildLandscapeColumn(right, innerTop, columnWidth, innerHeight, rightRoles),
  ];
}

export function getLandscapeSeatRotation(layout: SquareSeatLayout, tableWidth: number): number {
  const seatCenter = layout.left + layout.width / 2;
  return seatCenter <= tableWidth / 2 ? 90 : -90;
}

export function getSquareTableLayouts(
  playerCount: number,
  width: number,
  height: number,
  variant: TableLayoutVariant = 'classic',
  orientation: TableOrientation = 'portrait',
): SquareSeatLayout[] {
  if (orientation === 'landscape' && playerCount >= 2 && playerCount <= 6) {
    return buildLandscapeTable(playerCount, width, height, variant);
  }

  switch (playerCount) {
    case 2:
    case 3:
    case 4:
    case 5:
    case 6:
      return variant === 'opposed'
        ? buildOpposedTable(playerCount, width, height)
        : buildClassicTable(playerCount, width, height);
    default:
      return buildGrid(2, 3, width, height, (col, row) => {
        const roles: SeatRole[][] = [
          ['topLeft', 'topRight'],
          ['bottomLeft', 'bottomRight'],
          ['top', 'bottom'],
        ];
        return roles[row]?.[col] ?? 'bottom';
      });
  }
}

type SeatPlayer = {
  slot: number;
  participantKey: string;
};

export type SeatAssignment<T extends SeatPlayer> = {
  player: T;
  layout: SquareSeatLayout;
};

function getViewerAnchorRole(playerCount: number): SeatRole {
  if (playerCount === 2) return 'bottom';
  return 'bottomRight';
}

function resolveCapotavolaPlayer<T extends SeatPlayer>(
  players: T[],
  viewerKey: string | null,
): T | null {
  const sorted = [...players].sort((left, right) => left.slot - right.slot);
  const slotZero = sorted.find((player) => player.slot === 0);
  if (slotZero && slotZero.participantKey !== viewerKey) return slotZero;
  return sorted.find((player) => player.participantKey !== viewerKey) ?? null;
}

export function mapPlayersToSeats<T extends SeatPlayer>(
  players: T[],
  layouts: SquareSeatLayout[],
  viewerKey: string | null,
): SeatAssignment<T>[] {
  const sorted = [...players].sort((left, right) => left.slot - right.slot);
  if (sorted.length !== layouts.length) {
    return sorted.map((player, index) => ({ player, layout: layouts[index]! }));
  }

  const viewer = viewerKey
    ? sorted.find((player) => player.participantKey === viewerKey) ?? null
    : null;
  if (!viewer) {
    return sorted.map((player, index) => ({ player, layout: layouts[index]! }));
  }

  const anchorRole = getViewerAnchorRole(sorted.length);
  const anchorLayout = layouts.find((layout) => layout.role === anchorRole) ?? layouts[layouts.length - 1]!;
  const headLayout = layouts.find((layout) => layout.role === 'capotavola') ?? null;
  const capotavola = headLayout ? resolveCapotavolaPlayer(sorted, viewerKey) : null;

  const usedLayouts = new Set<SquareSeatLayout>();
  const usedPlayers = new Set<string>();
  const assignments: SeatAssignment<T>[] = [];

  if (capotavola && headLayout) {
    assignments.push({ player: capotavola, layout: headLayout });
    usedLayouts.add(headLayout);
    usedPlayers.add(capotavola.participantKey);
  }

  if (viewer) {
    assignments.push({ player: viewer, layout: anchorLayout });
    usedLayouts.add(anchorLayout);
    usedPlayers.add(viewer.participantKey);
  }

  const remainingLayouts = layouts.filter((layout) => !usedLayouts.has(layout));
  const remainingPlayers = sorted.filter((player) => !usedPlayers.has(player.participantKey));

  remainingPlayers.forEach((player, index) => {
    assignments.push({ player, layout: remainingLayouts[index]! });
  });

  return assignments;
}
