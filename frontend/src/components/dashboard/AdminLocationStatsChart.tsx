"use client";

import type { AdminLocationTopResortRow } from "@/lib/api/admin";

export type AdminLocationStatsChartProps = {
  rows: AdminLocationTopResortRow[];
  limit?: number;
};

function barWidth(value: number, max: number): number {
  if (max <= 0 || value <= 0) return 0;
  return Math.max(8, Math.round((value / max) * 100));
}

export default function AdminLocationStatsChart({ rows, limit = 5 }: AdminLocationStatsChartProps) {
  const topRows = rows.slice(0, limit);
  const maxResorts = Math.max(1, ...topRows.map((r) => r.resort_count));

  if (topRows.length === 0) {
    return <p className="text-sm text-zinc-500">No resorts with address data in this area yet.</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-500">
        Top {Math.min(limit, topRows.length)} location{topRows.length === 1 ? "" : "s"} by resort count
      </p>

      <ul className="space-y-3.5" aria-label={`Top ${limit} resort locations`}>
        {topRows.map((row, index) => (
          <li key={`${row.location_label}-${index}`}>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <p className="min-w-0 truncate font-dash text-sm font-semibold text-navy" title={row.location_label}>
                <span className="mr-1.5 text-[11px] font-bold text-zinc-400">#{index + 1}</span>
                {row.location_label}
              </p>
              <span className="shrink-0 text-xs font-semibold tabular-nums text-navy">
                {row.resort_count} {row.resort_count === 1 ? "resort" : "resorts"}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-softGray">
              <div
                className="h-3 rounded-full bg-emerald-500 transition-[width] duration-300"
                style={{ width: `${barWidth(row.resort_count, maxResorts)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
