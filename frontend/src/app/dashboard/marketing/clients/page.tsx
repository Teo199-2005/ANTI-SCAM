"use client";

import DashCard from "@/components/dash/DashCard";
import { useToast } from "@/components/shared/ToastProvider";
import { getMarketingClients, type MarketingClientRow } from "@/lib/api/marketing";
import { ChevronLeft, ChevronRight, UserRound } from "lucide-react";
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

export default function MarketingClientsPage() {
  const { pushToast } = useToast();
  const [rows, setRows] = useState<MarketingClientRow[]>([]);
  const [tierPolicy, setTierPolicy] = useState("");
  const [page, setPage] = useState(1);
  const [perPage] = useState(12);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
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

  return (
    <div className="space-y-6">
      <div className="dash-hero-banner-cta">
        <p className="font-dash text-dash-xs font-medium text-white/70">Marketing</p>
        <h1 className="mt-1 font-dash text-dash-2xl font-bold text-white md:text-dash-3xl">Referral clients</h1>
        <p className="mt-2 max-w-2xl font-dash text-dash-sm text-white/85">
          Each row is one resort-owner organization (tenant). Multiple subscription payments or multiple resorts under the
          same owner still count as one client toward your tier.
        </p>
      </div>

      <DashCard className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-softBorder px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="inline-flex rounded-lg bg-violet-100 p-2">
              <UserRound size={18} className="text-violet-800" />
            </div>
            <div>
              <h2 className="font-dash text-base font-semibold text-navy">Clients with qualifying referral payments</h2>
              <p className="text-xs text-zinc-500">
                Paid platform subscription invoices (room add-ons excluded) where your referral code was applied.
              </p>
            </div>
          </div>
          <p className="text-xs font-semibold text-navy">
            {loading ? "…" : `${meta.total} client${meta.total === 1 ? "" : "s"}`}
          </p>
        </div>

        {loading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-softGray" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-zinc-500">
            No referral clients yet. When assigned resort owners subscribe using your code and pay, they appear here.
          </p>
        ) : (
          <div className="divide-y divide-softBorder">
            {rows.map((r) => (
              <div key={r.tenant_id} className="grid gap-3 px-5 py-4 md:grid-cols-12 md:items-center">
                <div className="md:col-span-4">
                  <p className="font-semibold text-navy">{r.tenant_name}</p>
                  <p className="text-xs text-zinc-500">Tenant · {r.tenant_slug}</p>
                  {r.owner_name ? (
                    <p className="mt-1 text-xs text-zinc-600">
                      Owner: {r.owner_name}
                      {r.owner_email ? <span className="text-zinc-400"> · {r.owner_email}</span> : null}
                    </p>
                  ) : null}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs md:col-span-5 md:grid-cols-2">
                  <div>
                    <p className="font-semibold uppercase tracking-wide text-zinc-400">First paid</p>
                    <p className="mt-0.5 text-zinc-800">{fmtWhen(r.first_qualifying_paid_at)}</p>
                  </div>
                  <div>
                    <p className="font-semibold uppercase tracking-wide text-zinc-400">Last paid</p>
                    <p className="mt-0.5 text-zinc-800">{fmtWhen(r.last_qualifying_paid_at)}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs md:col-span-3">
                  <span className="rounded-full bg-softGray px-2 py-0.5 font-semibold text-navy">
                    {r.qualifying_subscription_invoices} invoice{r.qualifying_subscription_invoices === 1 ? "" : "s"}
                  </span>
                  <span className="rounded-full bg-sky-50 px-2 py-0.5 font-semibold text-sky-900">
                    {r.referred_resorts_count} resort{r.referred_resorts_count === 1 ? "" : "s"}
                  </span>
                  <span className="font-semibold text-emerald-800">{fmtPhp(r.total_subscription_volume_php)}</span>
                </div>
              </div>
            ))}
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
