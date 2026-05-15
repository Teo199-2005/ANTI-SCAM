"use client";

import { Trash2, X } from "lucide-react";

type Props = {
  count: number;
  onDelete: () => void;
  onClear: () => void;
  deleting?: boolean;
  deleteLabel?: string;
};

export default function BulkActionBar({
  count,
  onDelete,
  onClear,
  deleting = false,
  deleteLabel = "Delete selected",
}: Props) {
  if (count <= 0) return null;

  return (
    <div className="sticky top-2 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-navy/15 bg-navy px-4 py-3 text-white shadow-card">
      <p className="text-sm font-medium">{count} selected on this page</p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-2 text-sm font-semibold transition hover:bg-white/25 disabled:opacity-50"
          onClick={onClear}
          disabled={deleting}
        >
          <X size={14} aria-hidden />
          Clear
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:opacity-50"
          onClick={onDelete}
          disabled={deleting}
        >
          <Trash2 size={14} aria-hidden />
          {deleting ? "Deleting…" : deleteLabel}
        </button>
      </div>
    </div>
  );
}
