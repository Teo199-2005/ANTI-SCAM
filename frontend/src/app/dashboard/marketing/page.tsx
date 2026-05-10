"use client";

import DashCard from "@/components/dash/DashCard";
import DashMobileTableCard, { DashMobileTableSkeleton } from "@/components/shared/DashMobileTableCard";
import StatCard from "@/components/dashboard/StatCard";
import { getAssignedResorts, getCommissions, getMarketingStats, getReleaseHistory, AssignedResort, Commission, CommissionRelease, MarketingStats } from "@/lib/api/marketing";
import { useAuth } from "@/contexts/AuthContext";
import { BadgeCheck, Building2, Clock, DollarSign, Link2, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const statusBadge: Record<string, string> = {
  pending:  "dash-badge-amber",
  released: "dash-badge-emerald",
};

export default function MarketingDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats]     = useState<MarketingStats | null>(null);
  const [resorts, setResorts] = useState<AssignedResort[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [releases, setReleases] = useState<CommissionRelease[]>([]);
  const [loading, setLoading] = useState(true);

  const firstName = user?.name?.split(" ")[0] ?? "Partner";

  useEffect(() => {
    const load = async () => {
      try {
        const [s, r, c, rel] = await Promise.all([
          getMarketingStats(),
          getAssignedResorts(),
          getCommissions({ perPage: 10 }),
          getReleaseHistory({ perPage: 10 }),
        ]);
        setStats(s);
        setResorts(r);
        setCommissions(c.data);
        setReleases(rel.data);
      } catch (err) {
        // show empty state
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <div className="space-y-6">

      {/* Hero banner */}
      <div className="dash-hero-banner">
        <p className="font-dash text-dash-xs font-medium text-white/70">Marketing portal</p>
        <h1 className="mt-1 font-dash text-dash-3xl font-bold text-white md:text-dash-4xl">Welcome, {firstName}!</h1>
        <p className="mt-1 max-w-xl font-dash text-dash-sm text-white/80">
          Track assigned resorts and commissions. KPIs below mirror this summary.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <StatCard compact label="Assigned resorts"  value={stats?.assignedResorts ?? "–"}                                       icon={Building2}  iconTone="navy" />
        <StatCard compact label="Total commissions" value={stats ? `₱${Number(stats.totalCommissions).toLocaleString()}` : "–"}    icon={TrendingUp}  iconTone="emerald" />
        <StatCard
          compact
          label="Pending (gross)"
          value={stats ? `₱${Number(stats.pendingCommissions).toLocaleString()}` : "–"}
          subtitle={
            stats
              ? `Est. payout ₱${Number(stats.pendingPayoutNetEstimate).toLocaleString()} (${Math.round(stats.payoutWithholdingRate * 100)}% taxes & fees)`
              : undefined
          }
          icon={Clock}
          iconTone="amber"
        />
        <StatCard
          compact
          label="Paid out (net)"
          value={stats ? `₱${Number(stats.releasedCommissions).toLocaleString()}` : "–"}
          subtitle={
            stats && stats.releasedCommissionsGross > 0
              ? `Booked gross ₱${Number(stats.releasedCommissionsGross).toLocaleString()}`
              : undefined
          }
          icon={DollarSign}
          iconTone="violet"
        />
      </div>

      <DashCard className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-violet-100 p-2">
            <Link2 size={18} className="text-violet-700" />
          </div>
          <div>
            <h2 className="font-dash text-sm font-semibold text-navy">Referral code & share links</h2>
            <p className="mt-0.5 font-mono text-sm font-bold tracking-wide text-zinc-800">
              {loading ? "…" : stats?.referral_code ?? "Generating…"}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Owners on your assigned resorts apply this in Subscribe checkout for discounted billing and your commission.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <Link
            href="/dashboard/marketing/analytics"
            className="dash-btn-sm justify-center border-navy/15 bg-white text-navy hover:bg-navy/5 sm:inline-flex"
          >
            Analytics
          </Link>
          <Link
            href="/dashboard/marketing/profile"
            className="dash-btn-sm justify-center border-navy/15 bg-white text-navy hover:bg-navy/5 sm:inline-flex"
          >
            Profile
          </Link>
        </div>
      </DashCard>

      {/* Assigned Resorts */}
      <DashCard className="overflow-hidden p-0">
        <div className="flex items-center justify-between gap-3 border-b border-softBorder px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="inline-flex rounded-lg bg-softGray p-2"><Building2 size={16} className="text-slateBlue" /></div>
            <div>
              <h2 className="font-dash text-base font-semibold text-navy">Assigned Resorts</h2>
              <p className="text-xs text-zinc-400">{resorts.length} resort{resorts.length !== 1 ? "s" : ""} assigned to you</p>
            </div>
          </div>
        </div>
        {loading ? (
          <div className="space-y-2 p-4">{[1,2,3].map(i => <div key={i} className="h-12 animate-pulse rounded-xl bg-softGray" />)}</div>
        ) : resorts.length === 0 ? (
          <p className="px-6 py-8 text-sm text-zinc-500">No resorts assigned yet. Contact your admin.</p>
        ) : (
          <div className="divide-y divide-softBorder">
            {resorts.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-4 px-6 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-navy">{r.name}</p>
                    {r.is_vip ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        <BadgeCheck size={10} /> VIP
                      </span>
                    ) : null}
                  </div>
                  {r.address ? <p className="text-xs text-zinc-400">{r.address}</p> : null}
                </div>
                <span className={r.is_publicly_listed ? "dash-badge-emerald" : "dash-badge-slate"}>
                  {r.is_publicly_listed ? "Listed" : "Unlisted"}
                </span>
              </div>
            ))}
          </div>
        )}
      </DashCard>

      {/* Commissions */}
      <DashCard className="overflow-hidden p-0">
        <div className="border-b border-softBorder px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="inline-flex rounded-lg bg-emerald-100 p-2"><TrendingUp size={16} className="text-emerald-600" /></div>
            <div>
              <h2 className="font-dash text-base font-semibold text-navy">Commission Summary</h2>
              <p className="text-xs text-zinc-400">Monthly commission breakdown per resort</p>
            </div>
          </div>
        </div>
        {loading ? (
          <>
            <div className="md:hidden p-4"><DashMobileTableSkeleton rows={3} /></div>
            <div className="hidden md:block space-y-2 p-4">{[1,2,3].map(i => <div key={i} className="h-12 animate-pulse rounded-xl bg-softGray" />)}</div>
          </>
        ) : commissions.length === 0 ? (
          <p className="px-6 py-8 text-sm text-zinc-500">No commissions recorded yet.</p>
        ) : (
          <>
            <div className="md:hidden space-y-3 p-4">
              {commissions.map((c) => (
                <DashMobileTableCard
                  key={c.id}
                  title={<span className="font-mono text-sm">{c.period}</span>}
                  fields={[
                    { label: "Resort", value: c.resort?.name ?? "–" },
                    { label: "Gross bookings", value: `₱${Number(c.grossBookings).toLocaleString()}` },
                    { label: "Rate", value: `${(Number(c.commissionRate) * 100).toFixed(1)}%` },
                    { label: "Commission", value: `₱${Number(c.commissionAmount).toLocaleString()}` },
                    {
                      label: "Status",
                      value: <span className={statusBadge[c.status] ?? "dash-badge-slate"}>{c.status}</span>,
                    },
                  ]}
                />
              ))}
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Resort</th>
                    <th>Gross Bookings</th>
                    <th>Rate</th>
                    <th>Commission</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map((c) => (
                    <tr key={c.id}>
                      <td className="font-mono text-xs text-navy">{c.period}</td>
                      <td className="font-semibold text-navy">{c.resort?.name ?? "–"}</td>
                      <td>₱{Number(c.grossBookings).toLocaleString()}</td>
                      <td>{(Number(c.commissionRate) * 100).toFixed(1)}%</td>
                      <td className="font-semibold text-emerald-700">₱{Number(c.commissionAmount).toLocaleString()}</td>
                      <td><span className={statusBadge[c.status] ?? "dash-badge-slate"}>{c.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </DashCard>

      {/* Release History */}
      <DashCard className="overflow-hidden p-0">
        <div className="border-b border-softBorder px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="inline-flex rounded-lg bg-violet-100 p-2"><DollarSign size={16} className="text-violet-600" /></div>
            <div>
              <h2 className="font-dash text-base font-semibold text-navy">Release History</h2>
              <p className="text-xs text-zinc-400">Manual commission releases processed by admin</p>
            </div>
          </div>
        </div>
        {loading ? (
          <div className="space-y-2 p-4">{[1,2].map(i => <div key={i} className="h-12 animate-pulse rounded-xl bg-softGray" />)}</div>
        ) : releases.length === 0 ? (
          <p className="px-6 py-8 text-sm text-zinc-500">No releases processed yet.</p>
        ) : (
          <div className="divide-y divide-softBorder">
            {releases.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-4 px-6 py-3">
                <div>
                  <p className="text-sm font-semibold text-navy">₱{Number(r.amount).toLocaleString()}</p>
                  {r.notes ? <p className="text-xs text-zinc-400">{r.notes}</p> : null}
                </div>
                <p className="text-xs text-zinc-400">{new Date(r.released_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </DashCard>
    </div>
  );
}

