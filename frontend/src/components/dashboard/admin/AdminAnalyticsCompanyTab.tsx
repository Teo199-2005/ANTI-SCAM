"use client";

import DashCard from "@/components/dash/DashCard";
import StatCard from "@/components/dashboard/StatCard";
import { getAdminCompanyAnalytics, type AdminCompanyAnalytics } from "@/lib/api/admin";
import { formatPhp } from "@/lib/formatPhp";
import { cn } from "@/lib/utils";
import {
  Briefcase,
  Code2,
  DollarSign,
  Megaphone,
  TrendingDown,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const EXEC_ICONS: Record<string, React.ElementType> = {
  coo: Briefcase,
  cto: Code2,
  cmo: Megaphone,
};

const EXEC_TONES: Record<string, "navy" | "sky" | "violet"> = {
  coo: "navy",
  cto: "sky",
  cmo: "violet",
};

type Props = {
  year: number;
  month?: number | "";
};

export function AdminAnalyticsCompanyTab({ year, month }: Props) {
  const [data, setData] = useState<AdminCompanyAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await getAdminCompanyAnalytics({
        year,
        month: month ? Number(month) : undefined,
      });
      setData(payload);
    } catch {
      setError("Could not load company analytics.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    void load();
  }, [load]);

  const maxExec = useMemo(
    () => Math.max(1, ...(data?.executives.map((e) => e.commission_total_php) ?? [1])),
    [data],
  );

  const maxMonthly = useMemo(
    () => Math.max(1, ...(data?.monthly_executive_accrual.map((m) => m.team_total_php) ?? [1])),
    [data],
  );

  if (loading && !data) {
    return <div className="dash-card p-8 text-center text-zinc-500">Loading company analytics…</div>;
  }

  if (error) {
    return <div className="dash-alert-error">{error}</div>;
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <DashCard className="border-l-4 border-l-clOcean p-4 text-sm text-zinc-700">
        <p className="font-semibold text-navy">Company retention model — {data.period_label}</p>
        <p className="mt-1">{data.policy_note}</p>
        <p className="mt-2 text-xs text-zinc-500">
          Marketer rate for new credits: {formatPhp(data.marketer_booking_rate_php)} ·{" "}
          {data.marketer_commissions_enabled ? "Enabled" : "Disabled"}
        </p>
      </DashCard>

      <div className="rounded-2xl border border-softBorderStrong/70 bg-softGray/20 p-2 sm:p-3">
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          <StatCard
            compact
            label="Guest booking inflow"
            value={formatPhp(data.guest_bookings.paid_total_php)}
            subtitle={`${data.guest_bookings.paid_count} paid stays`}
            icon={DollarSign}
            iconTone="emerald"
          />
          <StatCard
            compact
            label="Marketer commissions"
            value={formatPhp(data.marketer_booking_commissions.net_credited_php)}
            subtitle={`${data.qualifying_bookings.net_count} net qualifying bookings`}
            icon={Users}
            iconTone="amber"
          />
          <StatCard
            compact
            label="Executive team accrual"
            value={formatPhp(data.executive_team_total_php)}
            subtitle={`₱${data.executive_amount_php_per_booking} × 3 roles per booking`}
            icon={Briefcase}
            iconTone="violet"
          />
          <StatCard
            compact
            label="Est. platform retention"
            value={formatPhp(data.estimated_platform_retention_from_bookings_php)}
            subtitle="Guest inflow minus marketer & executive"
            icon={TrendingDown}
            iconTone="navy"
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {data.executives.map((exec) => {
          const Icon = EXEC_ICONS[exec.key] ?? Briefcase;
          const tone = EXEC_TONES[exec.key] ?? "navy";
          return (
            <DashCard key={exec.key} className="p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-clOcean/15 to-clOcean/5 text-clOcean">
                  <Icon size={22} strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-clOcean">{exec.role_short}</p>
                  <p className="font-semibold text-navy">{exec.name}</p>
                  <p className="text-xs text-zinc-500">{exec.role_title}</p>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-zinc-600">{exec.bio}</p>
              <div className="mt-4 border-t border-softBorder pt-3">
                <p className="text-2xl font-bold text-navy">{formatPhp(exec.commission_total_php)}</p>
                <p className="text-[11px] text-zinc-500">
                  {exec.qualifying_bookings} bookings × {formatPhp(exec.amount_php_per_booking)}
                </p>
              </div>
            </DashCard>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DashCard className="p-5">
          <h2 className="text-sm font-semibold text-navy">Executive accrual by role</h2>
          <p className="mb-4 text-xs text-zinc-400">Same net qualifying bookings; ₱20 per role per booking.</p>
          <div className="space-y-4">
            {data.executives.map((exec) => {
              const w = Math.max(8, Math.round((exec.commission_total_php / maxExec) * 100));
              return (
                <div key={exec.key}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-medium text-zinc-700">
                      {exec.role_short} — {exec.name}
                    </span>
                    <span className="font-semibold text-navy">{formatPhp(exec.commission_total_php)}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-softGray">
                    <div
                      className="h-2.5 rounded-full bg-gradient-to-r from-clOcean to-clTeal"
                      style={{ width: `${w}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </DashCard>

        <DashCard className="p-5">
          <h2 className="text-sm font-semibold text-navy">Booking revenue waterfall</h2>
          <p className="mb-4 text-xs text-zinc-400">How guest payments split before estimated retention.</p>
          <ul className="space-y-3">
            {data.waterfall.map((row) => (
              <li
                key={row.key}
                className={cn(
                  "flex items-start justify-between gap-3 rounded-xl border px-3 py-2.5 text-sm",
                  row.kind === "summary"
                    ? "border-emerald-200 bg-emerald-50/80 font-semibold"
                    : "border-softBorder bg-white",
                )}
              >
                <span className="text-zinc-700">{row.label}</span>
                <span
                  className={cn(
                    "shrink-0 tabular-nums",
                    row.amount_php >= 0 ? "text-emerald-700" : "text-rose-700",
                  )}
                >
                  {row.amount_php >= 0 ? "" : "−"}
                  {formatPhp(Math.abs(row.amount_php))}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-zinc-500">
            Subscription inflows ({formatPhp(data.subscription_inflows_paid_php)}) are separate from guest
            booking commissions and are not deducted in this waterfall.
          </p>
        </DashCard>
      </div>

      <DashCard className="p-5">
        <h2 className="mb-1 text-sm font-semibold text-navy">Monthly executive team accrual — {year}</h2>
        <p className="mb-4 text-xs text-zinc-400">Combined COO + CTO + CMO (₱60 per net qualifying booking)</p>
        <div className="flex items-end justify-between gap-1">
          {data.monthly_executive_accrual.map((m) => {
            const h = Math.max(6, Math.round((m.team_total_php / maxMonthly) * 100));
            const label = m.period.slice(5);
            return (
              <div key={m.period} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <div className="flex h-28 w-full max-w-[40px] items-end justify-center">
                  <div
                    className="w-full max-w-[28px] rounded-t-md bg-violet-500"
                    style={{ height: `${h}%` }}
                    title={`${m.qualifying_bookings} bookings · ${formatPhp(m.team_total_php)}`}
                  />
                </div>
                <span className="text-[9px] font-semibold text-zinc-500">{label}</span>
              </div>
            );
          })}
        </div>
      </DashCard>
    </div>
  );
}
