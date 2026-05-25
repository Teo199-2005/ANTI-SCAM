"use client";

import { AppSelect } from "@/components/shared/form";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

type TablePaginationBarProps = {
  page: number;
  lastPage: number;
  total: number;
  perPage: number;
  perPageOptions?: number[];
  onPerPageChange: (n: number) => void;
  onPageChange: (nextPage: number) => void;
  disabled?: boolean;
  className?: string;
};

export default function TablePaginationBar({
  page,
  lastPage,
  total,
  perPage,
  perPageOptions = [10, 15, 20, 25, 50],
  onPerPageChange,
  onPageChange,
  disabled,
  className,
}: TablePaginationBarProps) {
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);
  const safeLast = Math.max(1, lastPage);
  const canPrev = !disabled && page > 1;
  const canNext = !disabled && page < safeLast;

  return (
    <div
      className={cn(
        "dash-pagination-bar flex w-full flex-col gap-3 overflow-x-auto border-t border-zinc-200/90 bg-gradient-to-b from-white to-zinc-50/90 px-3 py-3 sm:flex-row sm:items-center sm:justify-end sm:gap-0 sm:px-4 sm:py-2.5",
        className,
      )}
    >
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-2 sm:flex-nowrap sm:justify-end sm:gap-x-3">
        <span className="hidden shrink-0 text-[13px] font-medium text-zinc-600 sm:inline">Items per page</span>
        <span className="inline shrink-0 text-[13px] font-medium text-zinc-600 sm:hidden">Per page</span>
        <AppSelect
          variant="compact"
          value={String(perPage)}
          disabled={disabled}
          aria-label="Items per page"
          onChange={(e) => onPerPageChange(Number(e.target.value))}
          options={perPageOptions.map((n) => ({ value: String(n), label: String(n) }))}
        />

        <span
          className="hidden h-4 w-px shrink-0 bg-zinc-200 sm:block"
          aria-hidden
        />

        <span className="shrink-0 whitespace-nowrap text-[13px] tabular-nums text-zinc-600">
          <span className="font-medium text-zinc-800">
            {from}–{to}
          </span>
          <span className="text-zinc-400"> of </span>
          <span className="font-medium text-zinc-800">{total}</span>
        </span>

        <span className="hidden h-4 w-px shrink-0 bg-zinc-200 sm:block" aria-hidden />

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            disabled={!canPrev}
            onClick={() => onPageChange(page - 1)}
            className={cn(
              "inline-flex h-8 items-center gap-0.5 rounded-lg border border-zinc-200 bg-white px-2.5 text-[13px] font-medium text-zinc-700 shadow-sm transition",
              "hover:border-zinc-300 hover:bg-zinc-50",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-skyBlue/30",
              "disabled:pointer-events-none disabled:border-zinc-100 disabled:bg-zinc-50/80 disabled:text-zinc-400",
            )}
          >
            <ChevronLeft className="size-4 shrink-0 opacity-70" aria-hidden />
            Prev
          </button>
          <span className="min-w-[5.5rem] shrink-0 px-1 text-center text-[12px] tabular-nums text-zinc-500">
            Page {page} / {safeLast}
          </span>
          <button
            type="button"
            disabled={!canNext}
            onClick={() => onPageChange(page + 1)}
            className={cn(
              "inline-flex h-8 items-center gap-0.5 rounded-lg border border-zinc-200 bg-white px-2.5 text-[13px] font-medium text-zinc-700 shadow-sm transition",
              "hover:border-zinc-300 hover:bg-zinc-50",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-skyBlue/30",
              "disabled:pointer-events-none disabled:border-zinc-100 disabled:bg-zinc-50/80 disabled:text-zinc-400",
            )}
          >
            Next
            <ChevronRight className="size-4 shrink-0 opacity-70" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
