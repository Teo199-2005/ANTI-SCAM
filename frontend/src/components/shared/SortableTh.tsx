"use client";

import { cn } from "@/lib/utils";
import type { SortDir } from "@/lib/tableSortPagination";

type SortableThProps = {
  label: string;
  /** Sent to API as sort_by (snake_case column) */
  sortKey: string;
  activeKey: string | null;
  direction: SortDir;
  onSort: (key: string) => void;
  className?: string;
  align?: "left" | "center" | "right";
};

/**
 * Clickable header cell — active column uses bold maroon + ↑/↓ (matches marketing table mockups).
 */
export default function SortableTh({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
  className,
  align = "left",
}: SortableThProps) {
  const active = activeKey === sortKey;
  const alignCls =
    align === "center" ? "justify-center text-center" : align === "right" ? "justify-end text-right" : "justify-start text-left";

  return (
    <th scope="col" className={cn(className)}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "group dash-sortable-th inline-flex w-full min-w-0 items-center gap-1 align-middle font-heading text-[11px] font-bold uppercase tracking-wider transition-colors",
          alignCls,
          active ? "text-amber-100" : "text-white/80 hover:text-white",
        )}
      >
        <span className="truncate">{label}</span>
        <span
          className={cn(
            "inline-flex shrink-0 tabular-nums leading-none",
            active ? "text-amber-50" : "text-white/50 opacity-0 transition-opacity group-hover:opacity-90",
          )}
          aria-hidden
        >
          {active ? (direction === "asc" ? "↑" : "↓") : <span className="text-[10px]">↕</span>}
        </span>
      </button>
    </th>
  );
}
