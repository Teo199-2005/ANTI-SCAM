"use client";

import { cn } from "@/lib/utils";
import { ReactNode } from "react";

type DataTableProps = {
  headers: ReactNode;
  /** Optional leading column (e.g. bulk-select checkbox header). */
  leadingHeader?: ReactNode;
  children: ReactNode;
  minWidthClass?: string;
  caption?: string;
  /** Main row + detail/expand row pairs — corrects action-column zebra striping */
  splitBodyRows?: boolean;
  /** Sticky footer inside the table chrome (e.g. pagination bar) */
  footer?: ReactNode;
  /** Accessible name for the horizontal scroll region (narrow viewports). */
  scrollRegionLabel?: string;
};

export default function DataTable({
  headers,
  leadingHeader,
  children,
  minWidthClass = "min-w-[640px]",
  caption,
  splitBodyRows = false,
  footer,
  scrollRegionLabel = "Data table — swipe sideways to see all columns",
}: DataTableProps) {
  return (
    <div className="dash-table-wrap">
      {caption ? (
        <div className="border-b border-softBorderStrong bg-softCard px-5 py-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">{caption}</p>
        </div>
      ) : null}
      <div
        className="dash-table-scroll-region overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]"
        role="region"
        aria-label={scrollRegionLabel}
      >
        <table className={cn("dash-table", minWidthClass, splitBodyRows && "dash-table--split-pairs")}>
          <thead>
            <tr>
              {leadingHeader}
              {headers}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
      {footer}
    </div>
  );
}
