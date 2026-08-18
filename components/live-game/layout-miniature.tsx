import { UserRound } from 'lucide-react';
import {
  getCenterToolbarBand,
  getSeatRotation,
  getSquareTableLayouts,
  type TableLayoutVariant,
} from '@/lib/live-game-table-layout';

const PREVIEW_WIDTH = 500;
const PREVIEW_HEIGHT = 320;

export function LayoutMiniature({
  playerCount,
  variant,
  tableLabel,
  seatLabel,
}: {
  playerCount: number;
  variant: TableLayoutVariant;
  tableLabel: string;
  seatLabel: string;
}) {
  const preview = getSquareTableLayouts(playerCount, PREVIEW_WIDTH, PREVIEW_HEIGHT, variant);
  const toolbarBand = getCenterToolbarBand(playerCount, PREVIEW_WIDTH, PREVIEW_HEIGHT, variant);

  return (
    <div className="relative aspect-[25/16] overflow-hidden rounded-2xl border border-emerald-300/20 bg-[radial-gradient(ellipse_at_center,#153321_0%,#09130d_58%,#030604_100%)] shadow-inner shadow-black/60">
      <div className="pointer-events-none absolute inset-2 rounded-xl border border-emerald-100/[.07]" />
      {toolbarBand ? (
        <span
          className="absolute z-10 grid place-items-center rounded-md border border-dashed border-amber-200/25 bg-amber-950/25 text-[7px] font-black uppercase tracking-[.2em] text-amber-100/55"
          style={{
            left: `${(toolbarBand.left / PREVIEW_WIDTH) * 100}%`,
            top: `${(toolbarBand.top / PREVIEW_HEIGHT) * 100}%`,
            width: `${(toolbarBand.width / PREVIEW_WIDTH) * 100}%`,
            height: `${(toolbarBand.height / PREVIEW_HEIGHT) * 100}%`,
            writingMode: toolbarBand.axis === 'vertical' ? 'vertical-rl' : 'horizontal-tb',
          }}
        >
          {tableLabel}
        </span>
      ) : null}
      {preview.map((seat, index) => {
        const rotation = getSeatRotation(seat.role, playerCount, variant);
        return (
          <span
            key={`${seat.role}-${index}`}
            className="absolute grid place-items-center overflow-hidden rounded-lg border border-emerald-200/45 bg-gradient-to-br from-emerald-400/30 to-teal-950/55 shadow-[inset_0_0_0_1px_rgba(255,255,255,.04),0_3px_10px_rgba(0,0,0,.35)]"
            style={{
              left: `${(seat.left / PREVIEW_WIDTH) * 100}%`,
              top: `${(seat.top / PREVIEW_HEIGHT) * 100}%`,
              width: `${(seat.width / PREVIEW_WIDTH) * 100}%`,
              height: `${(seat.height / PREVIEW_HEIGHT) * 100}%`,
            }}
          >
            <span
              className="flex items-center gap-1 rounded-md bg-black/45 px-1.5 py-1 text-[9px] font-black text-emerald-50 shadow-sm"
              style={{ transform: `rotate(${rotation}deg)` }}
            >
              <UserRound className="h-2.5 w-2.5" />
              <span className="sr-only">{seatLabel} </span>{index + 1}
              <span className="text-[7px] font-bold text-rose-200">40</span>
            </span>
            <span className="absolute inset-x-1 bottom-1 h-0.5 rounded-full bg-emerald-200/25" />
          </span>
        );
      })}
    </div>
  );
}
