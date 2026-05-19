"use client";

import { cn } from "@/lib/utils";
import { ReactNode } from "react";

type DataTableProps = {
  headers: ReactNode;
  /** Optional leading column (e.g. bulk-select checkbox header). */
  leadingHeader?: ReactNode;
  children: ReactNode;
  minWidthClass?: string;
  /** Extra classes on `<table>` (e.g. `table-fixed` for fit-to-container layouts). */
  tableClassName?: string;
  /** Optional `<colgroup>` for fixed column widths. */
  colgroup?: ReactNode;
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
  tableClassName,
  colgroup,
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
        className={cn(
          "dash-table-scroll-region overscroll-x-contain [-webkit-overflow-scrolling:touch]",
          minWidthClass?.includes("min-w-0") ? "overflow-x-hidden" : "overflow-x-auto",
        )}
        role="region"
        aria-label={scrollRegionLabel}
      >
        <table
          className={cn(
            "dash-table",
            minWidthClass,
            tableClassName,
            splitBodyRows && "dash-table--split-pairs",
          )}
        >
          {colgroup}
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
