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
    <div className="space-y-5">
      <p className="text-sm text-zinc-500">
        Top {Math.min(limit, topRows.length)} of {limit} location{topRows.length === 1 ? "" : "s"} by resort count
      </p>

      <ul className="space-y-4 md:space-y-5" aria-label={`Top ${limit} resort locations`}>
        {topRows.map((row, index) => (
          <li key={`${row.location_label}-${index}`}>
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-baseline gap-2.5">
                <span
                  className="inline-flex h-6 min-w-[1.5rem] shrink-0 items-center justify-center rounded-md bg-zinc-100 px-1.5 text-xs font-bold tabular-nums text-zinc-600"
                  aria-label={`Rank ${index + 1}`}
                >
                  {index + 1}
                </span>
                <span
                  className="min-w-0 truncate font-dash text-base font-semibold text-navy md:text-[1.05rem]"
                  title={row.location_label}
                >
                  {row.location_label}
                </span>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-navy">
                {row.resort_count} {row.resort_count === 1 ? "resort" : "resorts"}
              </span>
            </div>
            <div className="h-4 overflow-hidden rounded-full bg-softGray">
              <div
                className="h-4 rounded-full bg-emerald-500 transition-[width] duration-300"
                style={{ width: `${barWidth(row.resort_count, maxResorts)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
