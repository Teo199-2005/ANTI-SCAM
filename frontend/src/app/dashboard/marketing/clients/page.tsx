"use client";

import DashCard from "@/components/dash/DashCard";
import { useToast } from "@/components/shared/ToastProvider";
import { getMarketingClients, type MarketingClientRow } from "@/lib/api/marketing";
import { ChevronLeft, ChevronRight, Gift, UserRound } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

function fmtPhp(n: number) {
  return `₱${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtWhen(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "—";
  }
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
  } catch {
    return "—";
  }
}

/** Whole calendar days until trial end (0 = ends today). */
function trialDaysRemaining(endsAt: string | null): number | null {
  if (!endsAt) return null;
  try {
    const end = new Date(endsAt);
    const now = new Date();
    const ms = end.getTime() - now.getTime();
    if (ms <= 0) return 0;
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

function formatTrialRemainingLabel(endsAt: string | null, active: boolean): string {
  if (!active) return "Free trial ended";
  const days = trialDaysRemaining(endsAt);
  if (days === null) return "Free trial active";
  if (days === 0) return "Ends today";
  if (days === 1) return "1 day left";
  return `${days} days left`;
}

function clientRowKey(r: MarketingClientRow): string {
  if (r.tenant_id != null) return `tenant-${r.tenant_id}`;
  if (r.referred_user_id != null) return `user-${r.referred_user_id}`;
  return `owner-${r.owner_email ?? r.tenant_name}`;
}

function ClientRow({ r }: { r: MarketingClientRow }) {
  const isTrial = r.source === "signup_trial";
  const daysLeft = isTrial ? trialDaysRemaining(r.trial_ends_at) : null;
  const remainingLabel = isTrial ? formatTrialRemainingLabel(r.trial_ends_at, r.trial_active) : "";
  const trialProgressPct =
    r.trial_active && daysLeft !== null ? Math.min(100, Math.max(0, ((30 - daysLeft) / 30) * 100)) : 0;

  return (
    <div
      className={`grid grid-cols-1 gap-4 px-4 py-4 sm:grid-cols-12 sm:items-center sm:gap-3 sm:px-5 ${
        isTrial ? "bg-emerald-50/25 sm:bg-transparent" : ""
      }`}
    >
      {isTrial && r.trial_active ? (
        <div className="col-span-1 sm:col-span-12 md:hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200/90 bg-emerald-50 px-3 py-2.5">
            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-900">
              <Gift size={16} className="shrink-0" aria-hidden />
              {remainingLabel}
            </span>
            <span className="text-[11px] font-medium text-emerald-800/90">Ends {fmtDate(r.trial_ends_at)}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-emerald-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-[width] duration-500"
              style={{ width: `${trialProgressPct}%` }}
              role="progressbar"
              aria-valuenow={daysLeft ?? 0}
              aria-valuemin={0}
              aria-valuemax={30}
              aria-label={`${remainingLabel} of 30-day trial`}
            />
          </div>
        </div>
      ) : null}

      <div className="sm:col-span-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <p className="font-semibold text-navy">{r.tenant_name}</p>
          {isTrial ? (
            <span
              className={`hidden w-fit items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold md:inline-flex ${
                r.trial_active
                  ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200/80"
                  : "bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200/80"
              }`}
            >
              <Gift size={11} className="shrink-0" aria-hidden />
              <span className="normal-case tracking-normal">{remainingLabel}</span>
            </span>
          ) : null}
        </div>
        {r.tenant_slug ? <p className="text-xs text-zinc-500">Tenant · {r.tenant_slug}</p> : null}
        {r.owner_name ? (
          <p className="mt-1 text-xs text-zinc-600">
            Owner: {r.owner_name}
            {r.owner_email ? (
              <span className="block truncate text-zinc-400 sm:inline"> · {r.owner_email}</span>
            ) : null}
          </p>
        ) : null}
        {isTrial && r.referral_code ? (
          <p className="mt-1 text-[11px] text-zinc-500">
            Code used: <span className="font-mono font-semibold text-zinc-700">{r.referral_code}</span>
          </p>
        ) : null}
      </div>

      {isTrial ? (
        <div className="grid grid-cols-1 gap-3 text-xs sm:col-span-5 sm:grid-cols-2">
          <div className="rounded-lg border border-emerald-100 bg-white/90 px-3 py-2 sm:border-0 sm:bg-transparent sm:p-0">
            <p className="font-semibold uppercase tracking-wide text-zinc-400">Time remaining</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums leading-tight text-emerald-800 sm:text-sm">
              {r.trial_active ? remainingLabel : "Expired"}
            </p>
          </div>
          <div className="rounded-lg border border-emerald-100 bg-white/90 px-3 py-2 sm:border-0 sm:bg-transparent sm:p-0">
            <p className="font-semibold uppercase tracking-wide text-zinc-400">Trial ends</p>
            <p className="mt-0.5 font-medium text-zinc-800">{fmtDate(r.trial_ends_at)}</p>
          </div>
          <div className="col-span-1 hidden h-1.5 overflow-hidden rounded-full bg-emerald-100 sm:col-span-2 md:block">
            <div
              className="h-full rounded-full bg-emerald-500 transition-[width] duration-500"
              style={{ width: `${trialProgressPct}%` }}
              role="progressbar"
              aria-hidden
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 text-xs sm:col-span-5">
          <div>
            <p className="font-semibold uppercase tracking-wide text-zinc-400">First paid</p>
            <p className="mt-0.5 text-zinc-800">{fmtWhen(r.first_qualifying_paid_at)}</p>
          </div>
          <div>
            <p className="font-semibold uppercase tracking-wide text-zinc-400">Last paid</p>
            <p className="mt-0.5 text-zinc-800">{fmtWhen(r.last_qualifying_paid_at)}</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 text-xs sm:col-span-3">
        {isTrial ? (
          <>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-900">
              Does not count toward tier
            </span>
            <span className="rounded-full bg-sky-50 px-2 py-0.5 font-semibold text-sky-900">
              {r.referred_resorts_count} resort{r.referred_resorts_count === 1 ? "" : "s"}
            </span>
          </>
        ) : (
          <>
            <span className="rounded-full bg-softGray px-2 py-0.5 font-semibold text-navy">
              {r.qualifying_subscription_invoices} invoice{r.qualifying_subscription_invoices === 1 ? "" : "s"}
            </span>
            <span className="rounded-full bg-sky-50 px-2 py-0.5 font-semibold text-sky-900">
              {r.referred_resorts_count} resort{r.referred_resorts_count === 1 ? "" : "s"}
            </span>
            <span className="font-semibold text-emerald-800">{fmtPhp(r.total_subscription_volume_php)}</span>
          </>
        )}
      </div>
    </div>
  );
}

export default function MarketingClientsPage() {
  const { pushToast } = useToast();
  const [rows, setRows] = useState<MarketingClientRow[]>([]);
  const [tierPolicy, setTierPolicy] = useState("");
  const [page, setPage] = useState(1);
  const [perPage] = useState(12);
  const [meta, setMeta] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
    paid_total: 0,
    trial_total: 0,
    trial_active_total: 0,
  });
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (p: number) => {
      setLoading(true);
      try {
        const res = await getMarketingClients({ page: p, perPage });
        setRows(res.clients);
        setMeta(res.meta);
        setTierPolicy(res.tier_policy);
        setPage(res.meta.current_page);
      } catch {
        pushToast({ title: "Could not load clients", tone: "error" });
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [perPage, pushToast],
  );

  useEffect(() => {
    void load(1);
  }, [load]);

  const paidRows = rows.filter((r) => r.source === "paid_subscription");
  const trialRows = rows.filter((r) => r.source === "signup_trial");

  return (
    <div className="space-y-6">
      <div className="dash-hero-banner-cta">
        <p className="font-dash text-dash-xs font-medium text-white/70">Marketing</p>
        <h1 className="mt-1 font-dash text-dash-2xl font-bold text-white md:text-dash-3xl">Referral clients</h1>
        <p className="mt-2 max-w-2xl font-dash text-dash-sm text-white/85">
          Paid subscriptions count toward your tier. Owners who register with your code get a 30-day platform free trial
          and appear separately until they pay.
        </p>
      </div>

      <DashCard className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-softBorder px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="inline-flex rounded-lg bg-violet-100 p-2">
              <UserRound size={18} className="text-violet-800" />
            </div>
            <div>
              <h2 className="font-dash text-base font-semibold text-navy">Referral clients overview</h2>
              <p className="text-xs text-zinc-500">
                {loading
                  ? "Loading…"
                  : `${meta.paid_total} paid · ${meta.trial_active_total} active free trial${meta.trial_active_total === 1 ? "" : "s"}`}
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-softGray" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-zinc-500">
            No referral clients yet. Share your registration link so resort owners can sign up with your code.
          </p>
        ) : (
          <div className="divide-y divide-softBorder">
            {paidRows.length > 0 ? (
              <>
                <div className="border-b border-softBorder bg-zinc-50/80 px-5 py-2.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
                    Paid clients ({meta.paid_total})
                  </p>
                  <p className="text-[11px] text-zinc-500">Qualifying subscription payments — count toward your tier.</p>
                </div>
                {paidRows.map((r) => (
                  <ClientRow key={clientRowKey(r)} r={r} />
                ))}
              </>
            ) : null}

            {trialRows.length > 0 ? (
              <>
                <div className="border-b border-softBorder bg-emerald-50/50 px-5 py-2.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-900">
                    Free trial signups ({meta.trial_total})
                  </p>
                  <p className="text-[11px] text-emerald-800/90">
                    30-day platform access at registration. Does not count toward tier until they subscribe and pay.
                  </p>
                </div>
                {trialRows.map((r) => (
                  <ClientRow key={clientRowKey(r)} r={r} />
                ))}
              </>
            ) : null}
          </div>
        )}

        {!loading && meta.last_page > 1 ? (
          <div className="flex items-center justify-between gap-3 border-t border-softBorder px-5 py-3">
            <p className="text-xs text-zinc-500">
              Page {meta.current_page} of {meta.last_page}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => void load(page - 1)}
                className="dash-btn-sm inline-flex items-center gap-1 border-navy/15 bg-white text-navy disabled:opacity-40"
              >
                <ChevronLeft size={16} /> Prev
              </button>
              <button
                type="button"
                disabled={page >= meta.last_page}
                onClick={() => void load(page + 1)}
                className="dash-btn-sm inline-flex items-center gap-1 border-navy/15 bg-white text-navy disabled:opacity-40"
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        ) : null}
      </DashCard>

      {tierPolicy ? (
        <DashCard className="p-5">
          <h3 className="font-dash text-sm font-semibold text-navy">How clients affect your tier</h3>
          <p className="mt-2 text-xs leading-relaxed text-zinc-600">{tierPolicy}</p>
        </DashCard>
      ) : null}
    </div>
  );
}
