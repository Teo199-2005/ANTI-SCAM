"use client";

import { getReservationFeeComponents, RESERVATION_FEE_COPY, formatPhp } from "@/lib/reservationFeeBreakdown";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";

type Variant = "default" | "compact";

export function ReservationFeeBreakdownPanel({
  totalPhp,
  variant = "default",
  className,
  defaultExpanded = false,
}: {
  totalPhp: number;
  variant?: Variant;
  className?: string;
  /** When false (default), only the total is prominent; full line-items are behind the disclosure. */
  defaultExpanded?: boolean;
}) {
  const c = getReservationFeeComponents(totalPhp);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const detailsId = useId();
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

      <div className="mt-3">
        <button
          type="button"
          id={`${detailsId}-trigger`}
          aria-expanded={expanded}
          aria-controls={`${detailsId}-panel`}
          aria-label={expanded ? "Hide reservation fee breakdown" : "Show reservation fee breakdown"}
          onClick={() => setExpanded((v) => !v)}
          className={cn(
            "flex w-full items-center justify-between gap-3 rounded-lg border border-zinc-200/90 bg-white px-3 py-2.5 text-left shadow-sm transition hover:bg-zinc-50/80",
            tight ? "text-[11px]" : "text-xs",
          )}
        >
          <div className="min-w-0">
            <p className="font-semibold text-zinc-800">Reservation fee (pay online)</p>
            <p className="tabular-nums text-lg font-bold text-navy sm:text-xl">{formatPhp(c.total)}</p>
          </div>
          <span
            className={cn(
              "inline-flex shrink-0 rounded-lg border border-zinc-200 bg-zinc-50 p-1.5 text-zinc-600 transition-transform",
              expanded && "rotate-180",
            )}
            aria-hidden
          >
            <ChevronDown size={tight ? 18 : 20} strokeWidth={2.25} />
          </span>
        </button>

        {expanded ? (
          <div
            id={`${detailsId}-panel`}
            role="region"
            aria-labelledby={`${detailsId}-trigger`}
            className={cn(
              "mt-2 overflow-hidden rounded-lg border border-zinc-200/90 bg-white",
              tight ? "text-[11px]" : "text-xs",
            )}
          >
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
            <p className={cn("border-t border-zinc-100 px-3 py-2.5 leading-relaxed text-zinc-600", tight ? "text-[10px]" : "text-[11px] sm:text-xs")}>
              {RESERVATION_FEE_COPY.breakdownSummary}
            </p>
          </div>
        ) : (
          <p className={cn("mt-2 text-zinc-600", tight ? "text-[10px]" : "text-[11px]")}>
            Tap the arrow to see how the reservation fee is split (VAT, processing, platform).
          </p>
        )}
      </div>
    </div>
  );
}
