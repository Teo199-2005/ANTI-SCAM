"use client";

import DashCard from "@/components/dash/DashCard";
import { useToast } from "@/components/shared/ToastProvider";
import LocationFilterBar, {
  emptyLocationFilter,
  locationFilterToParams,
  type LocationFilterValue,
} from "@/components/locations/LocationFilterBar";
import { getMarketingClients, type MarketingClientRow } from "@/lib/api/marketing";
import { ChevronLeft, ChevronRight, UserRound } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { formatPhpLedger as fmtPhp } from "@/lib/formatPhp";

function fmtWhen(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "—";
  }
}

function clientRowKey(r: MarketingClientRow): string {
  if (r.tenant_id != null) return `tenant-${r.tenant_id}`;
  if (r.referred_user_id != null) return `user-${r.referred_user_id}`;
  return `owner-${r.owner_email ?? r.tenant_name}`;
}

function ClientRow({ r }: { r: MarketingClientRow }) {
  const isSignupReferral = r.source === "signup_referral" || r.source === "signup_trial";

  return (
    <div
      className={`grid grid-cols-1 gap-4 px-4 py-4 sm:grid-cols-12 sm:items-center sm:gap-3 sm:px-5 ${
        isSignupReferral ? "bg-violet-50/20 sm:bg-transparent" : ""
      }`}
    >
      <div className="sm:col-span-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <p className="font-semibold text-navy">{r.tenant_name}</p>
          {isSignupReferral ? (
            <span className="hidden w-fit rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-bold text-violet-800 md:inline-flex">
              Referred signup
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
        {isSignupReferral && r.referral_code ? (
          <p className="mt-1 text-[11px] text-zinc-500">
            Code used: <span className="font-mono font-semibold text-zinc-700">{r.referral_code}</span>
          </p>
        ) : null}
      </div>

      {isSignupReferral ? (
        <div className="text-xs sm:col-span-5">
          <p className="font-semibold uppercase tracking-wide text-zinc-400">Status</p>
          <p className="mt-0.5 text-zinc-800">Awaiting first paid subscription</p>
          <p className="mt-1 text-[11px] text-zinc-500">
            Earnings are from paid online guest bookings only (₱ per booking), not subscription payments.
          </p>
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
        {isSignupReferral ? (
          <span className="rounded-full bg-violet-50 px-2 py-0.5 font-semibold text-violet-900">
            {r.referred_resorts_count} resort{r.referred_resorts_count === 1 ? "" : "s"}
          </span>
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
  const [bookingPolicy, setBookingPolicy] = useState("");
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
  const [locationFilter, setLocationFilter] = useState<LocationFilterValue>(emptyLocationFilter);

  const load = useCallback(
    async (p: number, loc: LocationFilterValue = locationFilter) => {
      setLoading(true);
      try {
        const res = await getMarketingClients({ page: p, perPage, ...locationFilterToParams(loc) });
        setRows(res.clients);
        setMeta(res.meta);
        setBookingPolicy(res.booking_commission_policy ?? res.tier_policy ?? "");
        setPage(res.meta.current_page);
      } catch {
        pushToast({ title: "Could not load clients", tone: "error" });
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [locationFilter, perPage, pushToast],
  );

  useEffect(() => {
    void load(1);
  }, [load]);

  const paidRows = rows.filter((r) => r.source === "paid_subscription");
  const signupReferralRows = rows.filter(
    (r) => r.source === "signup_referral" || r.source === "signup_trial",
  );

  return (
    <div className="space-y-6">
      <div className="dash-hero-banner-cta">
        <p className="font-dash text-dash-xs font-medium text-white/70">Marketing</p>
        <h1 className="mt-1 font-dash text-dash-2xl font-bold text-white md:text-dash-3xl">Referral clients</h1>
        <p className="mt-2 max-w-2xl font-dash text-dash-sm text-white/85">
          Owners who register with your referral code are attributed to you until they pay. You earn booking commissions on paid
          online guest reservations — not on subscription invoices.
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
                  : `${meta.paid_total} paid · ${meta.trial_total} referred signup${meta.trial_total === 1 ? "" : "s"} awaiting payment`}
              </p>
            </div>
          </div>
          <div className="dash-filter-bar dash-filter-bar--flat">
            <LocationFilterBar
              label="Client resort location"
              value={locationFilter}
              onChange={(next) => {
                setLocationFilter(next);
                void load(1, next);
              }}
            />
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
                  <p className="text-[11px] text-zinc-500">Paid platform subscriptions (referral attribution only — not booking commission).</p>
                </div>
                {paidRows.map((r) => (
                  <ClientRow key={clientRowKey(r)} r={r} />
                ))}
              </>
            ) : null}

            {signupReferralRows.length > 0 ? (
              <>
                <div className="border-b border-softBorder bg-violet-50/40 px-5 py-2.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-violet-900">
                    Referred signups ({meta.trial_total})
                  </p>
                  <p className="text-[11px] text-violet-800/90">
                    Registered with your code; no subscription commission until they have paid online guest bookings at assigned resorts.
                  </p>
                </div>
                {signupReferralRows.map((r) => (
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

      {bookingPolicy ? (
        <DashCard className="p-5">
          <h3 className="font-dash text-sm font-semibold text-navy">Booking commission policy</h3>
          <p className="mt-2 text-xs leading-relaxed text-zinc-600">{bookingPolicy}</p>
        </DashCard>
      ) : null}
    </div>
  );
}
