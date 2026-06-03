"use client";

import { apiClient } from "@/lib/api/client";
import type { ApiEnvelope } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { Activity, BarChart3, Building2, Eye, Globe, Users } from "lucide-react";
import { useEffect, useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

type VisitorStats = {
  today: { total: number; unique: number };
  this_week: { total: number; unique: number };
  this_month: { total: number; unique: number };
  all_time: { total: number; unique: number };
};

type DailyVisit = {
  date: string;
  total: number;
  unique: number;
};

type TopPage = {
  page_url: string;
  total: number;
  unique: number;
};

type TopResort = {
  resort_id: number;
  resort_name: string | null;
  total: number;
  unique: number;
};

type RecentVisitor = {
  id: number;
  page_url: string;
  referrer_url: string | null;
  resort_name: string | null;
  is_unique: boolean;
  visited_at: string;
};

// ── API ────────────────────────────────────────────────────────────────────

async function fetchStats(): Promise<VisitorStats> {
  const { data } = await apiClient.get<ApiEnvelope<VisitorStats>>("/admin/visitors/stats");
  return data.data;
}

async function fetchDailyVisits(days = 30): Promise<DailyVisit[]> {
  const { data } = await apiClient.get<ApiEnvelope<DailyVisit[]>>("/admin/visitors/daily", { params: { days } });
  return data.data;
}

async function fetchTopPages(): Promise<TopPage[]> {
  const { data } = await apiClient.get<ApiEnvelope<TopPage[]>>("/admin/visitors/top-pages");
  return data.data;
}

async function fetchTopResorts(): Promise<TopResort[]> {
  const { data } = await apiClient.get<ApiEnvelope<TopResort[]>>("/admin/visitors/top-resorts");
  return data.data;
}

async function fetchRecentVisitors(): Promise<RecentVisitor[]> {
  const { data } = await apiClient.get<ApiEnvelope<RecentVisitor[]>>("/admin/visitors/recent");
  return data.data;
}

// ── Components ─────────────────────────────────────────────────────────────

function StatCard({ label, total, unique, icon: Icon }: { label: string; total: number; unique: number; icon: React.ElementType }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-zinc-500">
        <Icon size={16} className="text-clOcean" aria-hidden />
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <div className="mt-2 flex items-baseline gap-3">
        <span className="text-2xl font-bold text-zinc-900">{total.toLocaleString()}</span>
        <span className="text-sm text-zinc-500">
          {unique.toLocaleString()} unique
        </span>
      </div>
    </div>
  );
}

function MiniBar({ value, max, className }: { value: number; max: number; className?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="h-4 w-full rounded bg-zinc-100">
      <div className={cn("h-full rounded transition-all", className ?? "bg-clOcean/70")} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function AdminVisitorsPage() {
  const [stats, setStats] = useState<VisitorStats | null>(null);
  const [daily, setDaily] = useState<DailyVisit[]>([]);
  const [topPages, setTopPages] = useState<TopPage[]>([]);
  const [topResorts, setTopResorts] = useState<TopResort[]>([]);
  const [recent, setRecent] = useState<RecentVisitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [s, d, p, r, rv] = await Promise.all([
          fetchStats(),
          fetchDailyVisits(),
          fetchTopPages(),
          fetchTopResorts(),
          fetchRecentVisitors(),
        ]);
        if (cancelled) return;
        setStats(s);
        setDaily(d);
        setTopPages(p);
        setTopResorts(r);
        setRecent(rv);
      } catch {
        if (!cancelled) setError("Failed to load visitor data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="p-6 text-center text-zinc-500">Loading visitor analytics…</div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-6 text-center text-red-700">{error ?? "No data available."}</div>
    );
  }

  const maxDailyTotal = Math.max(...daily.map((d) => d.total), 1);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-zinc-900">Visitor Analytics</h1>
        <p className="mt-1 text-sm text-zinc-500">Track website visitors, page views, and resort traffic.</p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Today" total={stats.today.total} unique={stats.today.unique} icon={Eye} />
        <StatCard label="This Week" total={stats.this_week.total} unique={stats.this_week.unique} icon={Activity} />
        <StatCard label="This Month" total={stats.this_month.total} unique={stats.this_month.unique} icon={BarChart3} />
        <StatCard label="All Time" total={stats.all_time.total} unique={stats.all_time.unique} icon={Users} />
      </div>

      {/* Daily visits chart */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="font-heading text-lg font-bold text-zinc-900">Daily Visits</h2>
        <p className="mb-4 text-xs text-zinc-500">Last {daily.length} days</p>
        <div className="space-y-1.5">
          {daily.slice(-14).map((d) => (
            <div key={d.date} className="flex items-center gap-3">
              <span className="w-20 shrink-0 text-right text-xs tabular-nums text-zinc-500">
                {new Date(d.date + "T00:00:00").toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
              </span>
              <div className="flex-1">
                <MiniBar value={d.total} max={maxDailyTotal} />
              </div>
              <span className="w-10 text-right text-xs tabular-nums font-medium text-zinc-700">{d.total}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top pages */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="font-heading text-lg font-bold text-zinc-900">Top Pages</h2>
          <div className="mt-4 space-y-3">
            {topPages.length === 0 ? (
              <p className="text-sm text-zinc-500">No page visit data yet.</p>
            ) : (
              topPages.map((p) => (
                <div key={p.page_url} className="flex items-center gap-3">
                  <Globe size={14} className="shrink-0 text-clOcean" aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-sm text-zinc-700" title={p.page_url}>
                    {p.page_url}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums font-medium text-zinc-500">
                    {p.total} ({p.unique} unique)
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top resorts */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="font-heading text-lg font-bold text-zinc-900">Top Resort Pages</h2>
          <div className="mt-4 space-y-3">
            {topResorts.length === 0 ? (
              <p className="text-sm text-zinc-500">No resort visit data yet.</p>
            ) : (
              topResorts.map((r) => (
                <div key={r.resort_id} className="flex items-center gap-3">
                  <Building2 size={14} className="shrink-0 text-amber-500" aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-sm text-zinc-700">
                    {r.resort_name ?? `Resort #${r.resort_id}`}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums font-medium text-zinc-500">
                    {r.total} ({r.unique} unique)
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent visitors */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="font-heading text-lg font-bold text-zinc-900">Recent Visitors</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="pb-2 pr-4">Page</th>
                <th className="pb-2 pr-4">Resort</th>
                <th className="pb-2 pr-4">Referrer</th>
                <th className="pb-2 pr-4">Unique</th>
                <th className="pb-2">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {recent.map((v) => (
                <tr key={v.id} className="text-zinc-700">
                  <td className="max-w-[200px] truncate py-2 pr-4" title={v.page_url}>{v.page_url}</td>
                  <td className="py-2 pr-4">{v.resort_name ?? "—"}</td>
                  <td className="max-w-[150px] truncate py-2 pr-4" title={v.referrer_url ?? ""}>
                    {v.referrer_url ? (() => { try { return new URL(v.referrer_url).hostname; } catch { return v.referrer_url; } })() : "Direct"}
                  </td>
                  <td className="py-2 pr-4">
                    <span className={cn(
                      "inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold",
                      v.is_unique ? "bg-emerald-100 text-emerald-800" : "bg-zinc-100 text-zinc-600",
                    )}>
                      {v.is_unique ? "Yes" : "Repeat"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap py-2 text-xs text-zinc-500">
                    {new Date(v.visited_at).toLocaleString("en-PH", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
