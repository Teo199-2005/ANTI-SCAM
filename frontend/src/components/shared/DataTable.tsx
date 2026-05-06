"use client";

import { cn } from "@/lib/utils";
import { ReactNode } from "react";

type DataTableProps = {
  headers: ReactNode;
  children: ReactNode;
  minWidthClass?: string;
  caption?: string;
  /** Main row + detail/expand row pairs — corrects action-column zebra striping */
  splitBodyRows?: boolean;
};

export default function DataTable({
  headers,
  children,
  minWidthClass = "min-w-[640px]",
  caption,
  splitBodyRows = false,
}: DataTableProps) {
  return (
    <div className="dash-table-wrap">
      {caption ? (
        <div className="border-b border-softBorderStrong bg-softCard px-5 py-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">{caption}</p>
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <table className={cn("dash-table", minWidthClass, splitBodyRows && "dash-table--split-pairs")}>
          <thead>
            <tr>{headers}</tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}
