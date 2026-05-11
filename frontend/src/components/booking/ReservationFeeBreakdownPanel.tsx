"use client";

import { getReservationFeeComponents, RESERVATION_FEE_COPY, formatPhp } from "@/lib/reservationFeeBreakdown";
import { cn } from "@/lib/utils";

type Variant = "default" | "compact";

export function ReservationFeeBreakdownPanel({
  totalPhp,
  variant = "default",
  className,
}: {
  totalPhp: number;
  variant?: Variant;
  className?: string;
}) {
  const c = getReservationFeeComponents(totalPhp);
  if (c.total <= 0) return null;

  const tight = variant === "compact";

  return (
    <div
      className={cn(
        "rounded-xl border border-amber-200/90 bg-gradient-to-b from-amber-50/90 to-white/90 text-zinc-800 shadow-sm",
        tight ? "p-3" : "p-4",
        className,
      )}
    >
      <p className={cn("font-medium leading-snug text-amber-950", tight ? "text-[11px]" : "text-xs")}>
        {RESERVATION_FEE_COPY.collectedOnline}
      </p>
      <p className={cn("mt-1.5 font-medium leading-snug text-amber-950/95", tight ? "text-[11px]" : "text-xs")}>
        {RESERVATION_FEE_COPY.balanceAtResort}
      </p>
      <p
        className={cn(
          "mt-2 inline-flex items-center rounded-full border border-amber-300/80 bg-amber-100/80 px-2 py-0.5 font-semibold uppercase tracking-wide text-amber-950",
          tight ? "text-[9px]" : "text-[10px]",
        )}
      >
        {RESERVATION_FEE_COPY.vatInclusiveTag}
      </p>

      <div className={cn("mt-3 overflow-hidden rounded-lg border border-zinc-200/90 bg-white", tight ? "text-[11px]" : "text-xs")}>
        <div className="grid grid-cols-[1fr_auto] gap-x-3 border-b border-zinc-200 bg-zinc-50 px-3 py-2 font-semibold text-zinc-700">
          <span>Description</span>
          <span className="text-right tabular-nums">Amount</span>
        </div>
        <div className="divide-y divide-zinc-100">
          <div className="grid grid-cols-[1fr_auto] gap-x-3 px-3 py-2 font-semibold text-zinc-900">
            <span>Reservation Fee</span>
            <span className="text-right tabular-nums">{formatPhp(c.total)}</span>
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-x-3 px-3 py-2 text-zinc-700">
            <span>VAT Included</span>
            <span className="text-right tabular-nums">{formatPhp(c.vatIncluded)}</span>
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-x-3 px-3 py-2 text-zinc-700">
            <span>Payment Processing Fee</span>
            <span className="text-right tabular-nums">{formatPhp(c.paymentProcessing)}</span>
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-x-3 px-3 py-2 text-zinc-700">
            <span>Platform Service Amount</span>
            <span className="text-right tabular-nums">{formatPhp(c.platformService)}</span>
          </div>
        </div>
      </div>

      <p className={cn("mt-3 leading-relaxed text-zinc-600", tight ? "text-[10px]" : "text-[11px] sm:text-xs")}>
        {RESERVATION_FEE_COPY.breakdownSummary}
      </p>
    </div>
  );
}
