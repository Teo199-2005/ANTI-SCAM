"use client";

import DashCard from "@/components/dash/DashCard";
import BulkActionBar from "@/components/shared/BulkActionBar";
import { BulkSelectMobile, BulkSelectTd, BulkSelectTh } from "@/components/shared/BulkSelectCheckbox";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import DashMobileTableCard, { DashMobileTableSkeleton } from "@/components/shared/DashMobileTableCard";
import DashTableScrollRegion from "@/components/shared/DashTableScrollRegion";
import { useToast } from "@/components/shared/ToastProvider";
import {
  getAdminBookingCommissionAnalytics,
  getAdminCommissionReleases,
  getAdminFinanceCommissions,
  getAdminFinanceOverview,
  getAdminPaymentLedger,
  getAdminWithholdingBatches,
  type AdminBookingCommissionAnalytics,
  type AdminFinanceOverview,
  type FinanceCommissionRow,
  type FinanceLedgerRow,
  type FinanceWithholdingBatchRow,
  type CommissionReleaseRow,
} from "@/lib/api/admin";
import {
  ArrowLeftRight,
  Banknote,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Landmark,
  PieChart,
  Receipt,
  RefreshCw,
} from "lucide-react";
import {
  bulkDeleteFinanceCommissionReleases,
  bulkDeleteFinanceCommissions,
  bulkDeleteFinancePayoutBatches,
  bulkDeletePaymentLedger,
  bulkDeleteToastDescriptionGeneric,
  type PaymentLedgerDeleteEntry,
} from "@/lib/api/bulkDelete";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { useCallback, useEffect, useState } from "react";
import { formatPhpLedger as fmtPhp } from "@/lib/formatPhp";

function ledgerRowKey(row: FinanceLedgerRow): string {
  return `${row.entry_type}:${row.entry_id}`;
}

function parseLedgerKeys(keys: string[]): PaymentLedgerDeleteEntry[] {
  const seen = new Set<string>();
  const entries: PaymentLedgerDeleteEntry[] = [];
  for (const key of keys) {
    if (seen.has(key)) continue;
    const [entry_type, entry_id] = key.split(":");
    if (entry_type !== "subscription" && entry_type !== "booking") continue;
    const id = Number(entry_id);
    if (!Number.isFinite(id) || id < 1) continue;
    seen.add(key);
    entries.push({ entry_type, entry_id: id });
  }
  return entries;
}

type FinanceBulkTab = "ledger" | "commissions" | "withholding" | "releases";

type TabId = "overview" | "booking_commissions" | "ledger" | "commissions" | "withholding" | "releases";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: PieChart },
  { id: "booking_commissions", label: "Booking commissions", icon: Banknote },
  { id: "ledger", label: "Payment ledger", icon: Receipt },
  { id: "commissions", label: "Commission ledger", icon: Banknote },
  { id: "withholding", label: "Withholding & payouts", icon: Landmark },
  { id: "releases", label: "Release log", icon: BookOpen },
];

/** ≥16px on phones avoids iOS input zoom on native selects */
const financeSelectCls =
  "ml-1 rounded-lg border border-softBorder bg-white px-2 py-2 text-base md:text-sm [touch-action:manipulation]";

function StatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase() ?? "";
  const cls =
    s === "paid" || s === "released" || s === "succeeded"
      ? "dash-badge-emerald"
      : s === "pending" || s === "pending_submit" || s === "submitted"
        ? "dash-badge-amber"
        : s === "failed" || s === "cancelled"
          ? "dash-badge-rose"
          : "dash-badge-slate";
  return <span className={cls}>{status}</span>;
}

export default function AdminFinancePage() {
  const { pushToast } = useToast();
  const [tab, setTab] = useState<TabId>("overview");
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<AdminFinanceOverview | null>(null);

  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerType, setLedgerType] = useState<"all" | "subscription" | "booking">("all");
  const [ledgerRows, setLedgerRows] = useState<FinanceLedgerRow[]>([]);
  const [ledgerMeta, setLedgerMeta] = useState({ last_page: 1, total: 0 });

  const [commPage, setCommPage] = useState(1);
  const [commStatus, setCommStatus] = useState("");
  const [commRows, setCommRows] = useState<FinanceCommissionRow[]>([]);
  const [commMeta, setCommMeta] = useState({ last_page: 1, total: 0 });
  const [commSummary, setCommSummary] = useState<{
    pending_count: number;
    released_count: number;
    pending_gross: number;
    released_gross: number;
  } | null>(null);

  const [batchPage, setBatchPage] = useState(1);
  const [batchStatus, setBatchStatus] = useState("");
  const [batchRows, setBatchRows] = useState<FinanceWithholdingBatchRow[]>([]);
  const [batchMeta, setBatchMeta] = useState({ last_page: 1, total: 0 });
  const [batchSummary, setBatchSummary] = useState<{
    all_batches_count: number;
    succeeded_gross: number;
    succeeded_net: number;
    succeeded_withheld: number;
  } | null>(null);

  const [relPage, setRelPage] = useState(1);
  const [relRows, setRelRows] = useState<CommissionReleaseRow[]>([]);
  const [relMeta, setRelMeta] = useState({ last_page: 1, total: 0 });

  const [bookingYear, setBookingYear] = useState(new Date().getFullYear());
  const [bookingAnalytics, setBookingAnalytics] = useState<AdminBookingCommissionAnalytics | null>(null);

  const perPage = 15;

  const ledgerBulk = useBulkSelection(ledgerRows, ledgerRowKey);
  const commBulk = useBulkSelection(commRows, (c) => c.id);
  const batchBulk = useBulkSelection(batchRows, (b) => b.id);
  const relBulk = useBulkSelection(relRows, (r) => r.id);

  useEffect(() => {
    ledgerBulk.clear();
    commBulk.clear();
    batchBulk.clear();
    relBulk.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, ledgerPage, commPage, batchPage, relPage]);

  const activeBulkTab: FinanceBulkTab | null =
    tab === "ledger" || tab === "commissions" || tab === "withholding" || tab === "releases" ? tab : null;

  const activeBulk =
    activeBulkTab === "ledger"
      ? ledgerBulk
      : activeBulkTab === "commissions"
        ? commBulk
        : activeBulkTab === "withholding"
          ? batchBulk
          : activeBulkTab === "releases"
            ? relBulk
            : null;

  const bulkDeleteLabels: Record<FinanceBulkTab, { action: string; item: string; warning: string }> = {
    ledger: {
      action: "Delete selected ledger rows?",
      item: "row",
      warning: "Removes the underlying subscription invoice or guest reservation for each selected row.",
    },
    commissions: {
      action: "Delete selected commissions?",
      item: "commission",
      warning: "Also removes related release and booking-credit links for those commission rows.",
    },
    withholding: {
      action: "Delete selected payout batches?",
      item: "batch",
      warning: "Unlinks commissions from these batches and removes batch line items.",
    },
    releases: {
      action: "Delete selected release log entries?",
      item: "entry",
      warning: "Removes release audit rows only; linked commissions are not deleted.",
    },
  };

  const onFinanceBulkDelete = async () => {
    if (!activeBulkTab || !activeBulk) return;
    setBulkDeleting(true);
    try {
      let result: Awaited<ReturnType<typeof bulkDeletePaymentLedger>> | undefined;
      if (activeBulkTab === "ledger") {
        const entries = parseLedgerKeys(activeBulk.selectedIds);
        if (entries.length === 0) {
          pushToast({
            title: "Nothing to delete",
            description: "Select at least one valid ledger row on this page.",
            tone: "error",
          });
          return;
        }
        result = await bulkDeletePaymentLedger(entries);
        await loadLedger();
      } else if (activeBulkTab === "commissions") {
        const ids = activeBulk.selectedIds.map((id) => Number(id)).filter((id) => id > 0);
        if (ids.length === 0) {
          pushToast({ title: "Nothing to delete", description: "Select at least one commission.", tone: "error" });
          return;
        }
        result = await bulkDeleteFinanceCommissions(ids);
        await loadCommissions();
      } else if (activeBulkTab === "withholding") {
        const ids = activeBulk.selectedIds.map((id) => Number(id)).filter((id) => id > 0);
        if (ids.length === 0) {
          pushToast({ title: "Nothing to delete", description: "Select at least one payout batch.", tone: "error" });
          return;
        }
        result = await bulkDeleteFinancePayoutBatches(ids);
        await loadBatches();
      } else {
        const ids = activeBulk.selectedIds.map((id) => Number(id)).filter((id) => id > 0);
        if (ids.length === 0) {
          pushToast({ title: "Nothing to delete", description: "Select at least one release entry.", tone: "error" });
          return;
        }
        result = await bulkDeleteFinanceCommissionReleases(ids);
        await loadReleases();
      }
      if (!result) return;
      activeBulk.clear();
      const label = bulkDeleteLabels[activeBulkTab].item;
      pushToast({
        title: result.failed.length ? "Bulk delete completed with errors" : "Deleted",
        description: bulkDeleteToastDescriptionGeneric(result, label),
        tone: result.failed.length ? "warning" : "success",
      });
    } catch (err) {
      pushToast({
        title: "Bulk delete failed",
        description: parseApiErrorMessage(err, "Unable to delete selected rows."),
        tone: "error",
      });
    } finally {
      setBulkDeleting(false);
      setConfirmBulkDelete(false);
    }
  };

  const loadOverview = useCallback(async () => {
    const o = await getAdminFinanceOverview();
    setOverview(o);
  }, []);

  const loadLedger = useCallback(async () => {
    const p = await getAdminPaymentLedger({
      page: ledgerPage,
      per_page: perPage,
      type: ledgerType,
    });
    setLedgerRows(p.data);
    setLedgerMeta({ last_page: p.last_page, total: p.total });
  }, [ledgerPage, ledgerType]);

  const loadCommissions = useCallback(async () => {
    const r = await getAdminFinanceCommissions({
      page: commPage,
      per_page: perPage,
      status: commStatus || undefined,
    });
    setCommSummary(r.summary);
    setCommRows(r.commissions.data);
    setCommMeta({ last_page: r.commissions.last_page, total: r.commissions.total });
  }, [commPage, commStatus]);

  const loadBatches = useCallback(async () => {
    const r = await getAdminWithholdingBatches({
      page: batchPage,
      per_page: perPage,
      status: batchStatus || undefined,
    });
    setBatchSummary(r.summary);
    setBatchRows(r.batches.data);
    setBatchMeta({ last_page: r.batches.last_page, total: r.batches.total });
  }, [batchPage, batchStatus]);

  const loadReleases = useCallback(async () => {
    const p = await getAdminCommissionReleases({ page: relPage, per_page: perPage });
    setRelRows(p.data);
    setRelMeta({ last_page: p.last_page, total: p.total });
  }, [relPage]);

  const loadBookingAnalytics = useCallback(async () => {
    const a = await getAdminBookingCommissionAnalytics(bookingYear);
    setBookingAnalytics(a);
  }, [bookingYear]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        if (tab === "overview") await loadOverview();
        else if (tab === "booking_commissions") await loadBookingAnalytics();
        else if (tab === "ledger") await loadLedger();
        else if (tab === "commissions") await loadCommissions();
        else if (tab === "withholding") await loadBatches();
        else if (tab === "releases") await loadReleases();
      } catch {
        if (!cancelled) setError("Could not load finance data. Try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, loadOverview, loadBookingAnalytics, loadLedger, loadCommissions, loadBatches, loadReleases]);

  useEffect(() => {
    if (tab === "booking_commissions") {
      void loadBookingAnalytics();
    }
  }, [bookingYear, tab, loadBookingAnalytics]);

  const refresh = () => {
    if (tab === "overview") void loadOverview();
    else if (tab === "booking_commissions") void loadBookingAnalytics();
    else if (tab === "ledger") void loadLedger();
    else if (tab === "commissions") void loadCommissions();
    else if (tab === "withholding") void loadBatches();
    else void loadReleases();
  };

  const Paginate = ({
    page,
    lastPage,
    total,
    onPrev,
    onNext,
  }: {
    page: number;
    lastPage: number;
    total: number;
    onPrev: () => void;
    onNext: () => void;
  }) => (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-softBorder px-4 py-3 text-sm text-zinc-600">
      <span>
        Page {page} of {lastPage}
        {total ? ` · ${total} rows` : null}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          className="dash-btn-sm inline-flex min-h-11 items-center gap-1 disabled:opacity-40 [touch-action:manipulation] md:min-h-0"
          disabled={page <= 1}
          onClick={onPrev}
        >
          <ChevronLeft size={14} /> Prev
        </button>
        <button
          type="button"
          className="dash-btn-sm inline-flex min-h-11 items-center gap-1 disabled:opacity-40 [touch-action:manipulation] md:min-h-0"
          disabled={page >= lastPage}
          onClick={onNext}
        >
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="dash-filter-bar w-full flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="dash-page-title flex items-center gap-2">
            <ArrowLeftRight size={24} className="text-skyBlue" />
            Finance &amp; payouts
          </h1>
          <p className="dash-page-sub">
            Monitor subscription inflows, guest payments, marketer commissions, withholding, and bank payout batches in one place.
          </p>
        </div>
        <button type="button" className="dash-btn-sm shrink-0" onClick={() => void refresh()}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {activeBulkTab && activeBulk ? (
        <BulkActionBar
          count={activeBulk.selectedCount}
          onClear={activeBulk.clear}
          onDelete={() => setConfirmBulkDelete(true)}
          deleting={bulkDeleting}
          deleteLabel="Delete selected"
        />
      ) : null}

      <div className="flex flex-wrap gap-2 border-b border-softBorder pb-3">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id);
              }}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                active
                  ? "bg-navy text-white shadow-soft-sm"
                  : "bg-softCard text-zinc-600 ring-1 ring-softBorder hover:bg-metalFace"
              }`}
            >
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {error ? <div className="dash-alert-error">{error}</div> : null}

      {tab === "overview" && (
        <div className="space-y-4">
          {loading || !overview ? (
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-2xl bg-softGray" />
              ))}
            </div>
          ) : (
            <>
              <DashCard className="border-l-4 border-l-clOcean p-4 text-sm text-zinc-700">
                <p className="font-semibold text-navy">Configured marketer payout withholding</p>
                <p className="mt-1">
                  Platform rate: <strong>{overview.withholding_percent_label}</strong> of gross marketer commissions is withheld
                  before bank disbursement. Payout batches sum frozen commission row amounts — they never recalculate historical
                  credits when you change the rate in System Settings.
                </p>
              </DashCard>
              {overview.booking_commissions ? (
                <DashCard className="border-l-4 border-l-violet-500 p-4">
                  <p className="text-sm font-semibold text-navy">Booking commissions (YTD)</p>
                  <p className="mt-1 text-xs text-zinc-600">{overview.booking_commissions.policy_note}</p>
                  <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-zinc-500">Current rate (new credits)</p>
                      <p className="text-lg font-bold text-violet-800">{fmtPhp(overview.booking_commissions.current_rate_php)}</p>
                      <p className="text-[10px] text-zinc-500">{overview.booking_commissions.enabled ? "Enabled" : "Disabled"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-zinc-500">Credits (events)</p>
                      <p className="text-lg font-bold text-navy">{overview.booking_commissions.ytd.credits_count}</p>
                      <p className="text-[10px] text-zinc-500">{fmtPhp(overview.booking_commissions.ytd.credits_gross_php)} gross</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-zinc-500">Reversals</p>
                      <p className="text-lg font-bold text-amber-800">{overview.booking_commissions.ytd.reversals_count}</p>
                      <p className="text-[10px] text-zinc-500">{fmtPhp(overview.booking_commissions.ytd.reversals_gross_php)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-zinc-500">Net credited (YTD)</p>
                      <p className="text-lg font-bold text-emerald-700">{fmtPhp(overview.booking_commissions.ytd.net_credited_php)}</p>
                      <p className="text-[10px] text-zinc-500">Pending booking {fmtPhp(overview.booking_commissions.ledger.booking_pending_gross_php)}</p>
                    </div>
                  </div>
                </DashCard>
              ) : null}
              <div className="rounded-2xl border border-softBorderStrong/70 bg-softGray/20 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] sm:p-3">
                <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-3">
                <DashCard className="border-softBorderStrong/75 p-4 shadow-sm sm:p-5">
                  <p className="text-[10px] font-bold uppercase leading-tight tracking-wide text-zinc-500 sm:text-xs">Subscription in (paid)</p>
                  <p className="mt-1.5 break-words text-xl font-bold text-emerald-700 sm:mt-2 sm:text-2xl">{fmtPhp(overview.subscription_inflows_paid)}</p>
                  <p className="mt-1 text-[10px] text-zinc-500 sm:text-xs">{overview.counts.subscription_invoices_paid} paid invoices</p>
                </DashCard>
                <DashCard className="border-softBorderStrong/75 p-4 shadow-sm sm:p-5">
                  <p className="text-[10px] font-bold uppercase leading-tight tracking-wide text-zinc-500 sm:text-xs">Subscription in (pending)</p>
                  <p className="mt-1.5 break-words text-xl font-bold text-amber-700 sm:mt-2 sm:text-2xl">{fmtPhp(overview.subscription_inflows_pending)}</p>
                  <p className="mt-1 text-[10px] text-zinc-500 sm:text-xs">{overview.counts.subscription_invoices_unpaid} unpaid / open</p>
                </DashCard>
                <DashCard className="border-softBorderStrong/75 p-4 shadow-sm sm:p-5">
                  <p className="text-[10px] font-bold uppercase leading-tight tracking-wide text-zinc-500 sm:text-xs">Guest bookings paid</p>
                  <p className="mt-1.5 break-words text-xl font-bold text-navy sm:mt-2 sm:text-2xl">{fmtPhp(overview.guest_booking_paid_total)}</p>
                  <p className="mt-1 text-[10px] text-zinc-500 sm:text-xs">{overview.counts.reservations_paid} paid reservations</p>
                </DashCard>
                <DashCard className="border-softBorderStrong/75 p-4 shadow-sm sm:p-5">
                  <p className="text-[10px] font-bold uppercase leading-tight tracking-wide text-zinc-500 sm:text-xs">Commissions (gross pending)</p>
                  <p className="mt-1.5 break-words text-xl font-bold text-violet-800 sm:mt-2 sm:text-2xl">{fmtPhp(overview.commission_gross_pending)}</p>
                  <p className="mt-1 text-[10px] text-zinc-500 sm:text-xs">{overview.counts.commissions_pending} rows</p>
                </DashCard>
                <DashCard className="border-softBorderStrong/75 p-4 shadow-sm sm:p-5">
                  <p className="text-[10px] font-bold uppercase leading-tight tracking-wide text-zinc-500 sm:text-xs">Commissions (gross released)</p>
                  <p className="mt-1.5 break-words text-xl font-bold text-zinc-800 sm:mt-2 sm:text-2xl">{fmtPhp(overview.commission_gross_released)}</p>
                  <p className="mt-1 text-[10px] text-zinc-500 sm:text-xs">{overview.counts.commissions_released} rows</p>
                </DashCard>
                <DashCard className="border-softBorderStrong/75 p-4 shadow-sm sm:p-5">
                  <p className="text-[10px] font-bold uppercase leading-tight tracking-wide text-zinc-500 sm:text-xs">Net paid to marketers</p>
                  <p className="mt-1.5 break-words text-xl font-bold text-sky-800 sm:mt-2 sm:text-2xl">{fmtPhp(overview.commission_net_paid_to_marketers)}</p>
                  <p className="mt-1 text-[10px] text-zinc-500 sm:text-xs">Sum of commission release amounts</p>
                </DashCard>
                <DashCard className="border-softBorderStrong/75 p-4 shadow-sm sm:p-5">
                  <p className="text-[10px] font-bold uppercase leading-tight tracking-wide text-zinc-500 sm:text-xs">Withheld (succeeded batches)</p>
                  <p className="mt-1.5 break-words text-xl font-bold text-rose-800 sm:mt-2 sm:text-2xl">{fmtPhp(overview.withheld_on_succeeded_batches)}</p>
                  <p className="mt-1 text-[10px] leading-snug text-zinc-500 sm:text-xs">
                    Gross {fmtPhp(overview.payout_batches_succeeded_gross)} → net {fmtPhp(overview.payout_batches_succeeded_net)}
                  </p>
                </DashCard>
                <DashCard className="border-softBorderStrong/75 p-4 shadow-sm sm:p-5">
                  <p className="text-[10px] font-bold uppercase leading-tight tracking-wide text-zinc-500 sm:text-xs">Payout batches</p>
                  <p className="mt-1.5 break-words text-xl font-bold text-navy sm:mt-2 sm:text-2xl">{overview.counts.payout_batches_total}</p>
                  <p className="mt-1 text-[10px] text-zinc-500 sm:text-xs">All statuses (see Withholding tab)</p>
                </DashCard>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {tab === "booking_commissions" && (
        <div className="space-y-4">
          <label className="text-xs font-semibold text-zinc-600">
            Year{" "}
            <select
              className={financeSelectCls}
              value={bookingYear}
              onChange={(e) => setBookingYear(Number(e.target.value))}
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          {loading || !bookingAnalytics ? (
            <div className="h-40 animate-pulse rounded-2xl bg-softGray" />
          ) : (
            <>
              <DashCard className="p-4 text-sm text-zinc-700">{bookingAnalytics.policy_note}</DashCard>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <DashCard className="p-4">
                  <p className="text-[10px] font-bold uppercase text-zinc-500">Credits</p>
                  <p className="text-2xl font-bold text-navy">{bookingAnalytics.totals.credits_count}</p>
                  <p className="text-xs">{fmtPhp(bookingAnalytics.totals.credits_gross_php)}</p>
                </DashCard>
                <DashCard className="p-4">
                  <p className="text-[10px] font-bold uppercase text-zinc-500">Net credited</p>
                  <p className="text-2xl font-bold text-emerald-700">{fmtPhp(bookingAnalytics.totals.net_credited_php)}</p>
                </DashCard>
              </div>
            </>
          )}
        </div>
      )}

      {tab === "ledger" && (
        <DashCard className="overflow-hidden p-0">
          <div className="flex flex-wrap items-center gap-3 border-b border-softBorder px-4 py-3">
            <label className="text-xs font-semibold text-zinc-600">
              Type{" "}
              <select
                className={financeSelectCls}
                value={ledgerType}
                onChange={(e) => {
                  setLedgerType(e.target.value as typeof ledgerType);
                  setLedgerPage(1);
                }}
              >
                <option value="all">All</option>
                <option value="subscription">Subscriptions</option>
                <option value="booking">Guest bookings</option>
              </select>
            </label>
          </div>
          {loading ? (
            <div className="p-4">
              <DashMobileTableSkeleton rows={6} />
            </div>
          ) : ledgerRows.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-zinc-500">No ledger rows yet.</p>
          ) : (
            <>
              <div className="md:hidden space-y-3 p-4">
                {ledgerRows.map((row) => (
                  <DashMobileTableCard
                    key={`${row.entry_type}-${row.entry_id}`}
                    title={
                      <span className="inline-flex items-start gap-2 font-semibold text-navy">
                        <BulkSelectMobile
                          checked={ledgerBulk.isSelected(ledgerRowKey(row))}
                          onChange={() => ledgerBulk.toggle(ledgerRowKey(row))}
                          ariaLabel={`Select ledger row ${row.entry_type} ${row.entry_id}`}
                        />
                        <span>
                          {row.entry_type === "subscription" ? "Subscription" : "Booking"} · {row.resort_name}
                        </span>
                      </span>
                    }
                    fields={[
                      { label: "Amount", value: fmtPhp(row.amount) },
                      { label: "Status", value: <StatusBadge status={row.status} /> },
                      {
                        label: "When",
                        value: row.occurred_at ? new Date(row.occurred_at).toLocaleString() : "—",
                      },
                      { label: "Reference", value: <span className="font-mono text-xs break-all">{row.reference ?? "—"}</span> },
                    ]}
                  />
                ))}
              </div>
              <div className="hidden md:block">
                <DashTableScrollRegion label="Payment ledger table">
                  <table className="dash-table min-w-[720px]">
                  <thead>
                    <tr>
                      <BulkSelectTh
                        checked={ledgerBulk.isAllSelected}
                        indeterminate={ledgerBulk.isSomeSelected}
                        onChange={() => (ledgerBulk.isAllSelected ? ledgerBulk.clear() : ledgerBulk.selectAll())}
                      />
                      <th>Type</th>
                      <th>Resort</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Occurred</th>
                      <th>Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerRows.map((row) => (
                      <tr key={`${row.entry_type}-${row.entry_id}`}>
                        <BulkSelectTd
                          checked={ledgerBulk.isSelected(ledgerRowKey(row))}
                          onChange={() => ledgerBulk.toggle(ledgerRowKey(row))}
                          ariaLabel={`Select ledger row ${row.entry_type} ${row.entry_id}`}
                        />
                        <td className="capitalize text-sm">{row.entry_type}</td>
                        <td className="text-sm">{row.resort_name}</td>
                        <td className="font-mono text-sm">{fmtPhp(row.amount)}</td>
                        <td>
                          <StatusBadge status={row.status} />
                        </td>
                        <td className="text-xs text-zinc-600">
                          {row.occurred_at ? new Date(row.occurred_at).toLocaleString() : "—"}
                        </td>
                        <td className="max-w-[200px] truncate font-mono text-xs">{row.reference ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </DashTableScrollRegion>
              </div>
              <Paginate
                page={ledgerPage}
                lastPage={ledgerMeta.last_page}
                total={ledgerMeta.total}
                onPrev={() => setLedgerPage((p) => Math.max(1, p - 1))}
                onNext={() => setLedgerPage((p) => Math.min(ledgerMeta.last_page, p + 1))}
              />
            </>
          )}
        </DashCard>
      )}

      {tab === "commissions" && (
        <DashCard className="overflow-hidden p-0">
          {commSummary && (
            <div className="grid grid-cols-2 gap-3 border-b border-softBorder p-4">
              <div className="rounded-xl border border-softBorder/80 bg-softGray/50 px-3 py-2">
                <p className="text-[10px] font-bold uppercase text-zinc-500">Pending rows</p>
                <p className="text-lg font-bold text-navy">{commSummary.pending_count}</p>
                <p className="text-xs text-zinc-600">{fmtPhp(commSummary.pending_gross)} gross</p>
              </div>
              <div className="rounded-xl border border-softBorder/80 bg-softGray/50 px-3 py-2">
                <p className="text-[10px] font-bold uppercase text-zinc-500">Released rows</p>
                <p className="text-lg font-bold text-navy">{commSummary.released_count}</p>
                <p className="text-xs text-zinc-600">{fmtPhp(commSummary.released_gross)} gross</p>
              </div>
            </div>
          )}
          <div className="px-4 py-3">
            <label className="text-xs font-semibold text-zinc-600">
              Status{" "}
              <select
                className={financeSelectCls}
                value={commStatus}
                onChange={(e) => {
                  setCommStatus(e.target.value);
                  setCommPage(1);
                }}
              >
                <option value="">All</option>
                <option value="pending">pending</option>
                <option value="released">released</option>
              </select>
            </label>
          </div>
          {loading ? (
            <div className="p-4">
              <DashMobileTableSkeleton rows={5} />
            </div>
          ) : commRows.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-zinc-500">No commissions.</p>
          ) : (
            <>
              <div className="md:hidden space-y-3 p-4">
                {commRows.map((c) => (
                  <DashMobileTableCard
                    key={c.id}
                    title={
                      <span className="inline-flex items-center gap-2 font-mono text-sm text-navy">
                        <BulkSelectMobile
                          checked={commBulk.isSelected(c.id)}
                          onChange={() => commBulk.toggle(c.id)}
                          ariaLabel={`Select commission ${c.id}`}
                        />
                        Commission #{c.id}
                      </span>
                    }
                    fields={[
                      { label: "Marketer", value: c.marketer?.name ?? String(c.marketer_id) },
                      { label: "Resort", value: c.resort?.name ?? String(c.resort_id) },
                      { label: "Period", value: <span className="font-mono text-xs">{c.period}</span> },
                      {
                        label: "Tier (last credit)",
                        value:
                          c.commission_source === "booking_commission" ? (
                            <span className="dash-badge-violet text-[10px]">Booking</span>
                          ) : c.commission_source === "subscription_legacy" ? (
                            <span className="dash-badge-slate text-[10px]">Legacy sub</span>
                          ) : (
                            "—"
                          ),
                      },
                      {
                        label: "Unit / gross",
                        value:
                          c.unit_commission_php != null && String(c.unit_commission_php) !== ""
                            ? `${fmtPhp(String(c.unit_commission_php))} · ${fmtPhp(c.commission_amount)}`
                            : fmtPhp(c.commission_amount),
                      },
                      { label: "Status", value: <StatusBadge status={c.status} /> },
                      {
                        label: "Payout batch",
                        value:
                          c.payout_batch != null ? (
                            <span className="break-all font-mono text-xs">
                              {c.payout_batch.reference_id} ({c.payout_batch.status})
                            </span>
                          ) : (
                            "—"
                          ),
                      },
                    ]}
                  />
                ))}
              </div>
              <div className="hidden md:block">
                <DashTableScrollRegion label="Commissions table">
                  <table className="dash-table min-w-[1080px]">
                  <thead>
                    <tr>
                      <BulkSelectTh
                        checked={commBulk.isAllSelected}
                        indeterminate={commBulk.isSomeSelected}
                        onChange={() => (commBulk.isAllSelected ? commBulk.clear() : commBulk.selectAll())}
                      />
                      <th>ID</th>
                      <th>Marketer</th>
                      <th>Resort</th>
                      <th>Period</th>
                      <th>Tier</th>
                      <th>Gross</th>
                      <th>Status</th>
                      <th>Payout batch</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commRows.map((c) => (
                      <tr key={c.id}>
                        <BulkSelectTd
                          checked={commBulk.isSelected(c.id)}
                          onChange={() => commBulk.toggle(c.id)}
                          ariaLabel={`Select commission ${c.id}`}
                        />
                        <td className="font-mono text-xs">{c.id}</td>
                        <td className="text-sm">{c.marketer?.name ?? c.marketer_id}</td>
                        <td className="text-sm">{c.resort?.name ?? c.resort_id}</td>
                        <td className="font-mono text-xs">{c.period}</td>
                        <td>
                          {c.commission_source === "booking_commission" ? (
                            <span className="dash-badge-violet text-[10px]">Booking</span>
                          ) : c.commission_source === "subscription_legacy" ? (
                            <span className="dash-badge-slate text-[10px]">Legacy</span>
                          ) : (
                            <span className="text-xs text-zinc-400">—</span>
                          )}
                        </td>
                        <td className="font-mono text-sm">
                          {fmtPhp(c.commission_amount)}
                          {c.unit_commission_php != null && String(c.unit_commission_php) !== "" ? (
                            <span className="ml-1 block text-[11px] font-normal text-zinc-500">
                              @ {fmtPhp(String(c.unit_commission_php))} / credit
                            </span>
                          ) : null}
                        </td>
                        <td>
                          <StatusBadge status={c.status} />
                        </td>
                        <td className="text-xs">
                          {c.payout_batch ? (
                            <span className="font-mono">
                              {c.payout_batch.reference_id} ({c.payout_batch.status})
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </DashTableScrollRegion>
              </div>
              <Paginate
                page={commPage}
                lastPage={commMeta.last_page}
                total={commMeta.total}
                onPrev={() => setCommPage((p) => Math.max(1, p - 1))}
                onNext={() => setCommPage((p) => Math.min(commMeta.last_page, p + 1))}
              />
            </>
          )}
        </DashCard>
      )}

      {tab === "withholding" && (
        <DashCard className="overflow-hidden p-0">
          {batchSummary && (
            <div className="grid grid-cols-2 gap-3 border-b border-softBorder p-4 lg:grid-cols-3">
              <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-3 py-2 ring-1 ring-emerald-100">
                <p className="text-[10px] font-bold uppercase text-emerald-800">Succeeded gross</p>
                <p className="text-lg font-bold text-emerald-900">{fmtPhp(batchSummary.succeeded_gross)}</p>
              </div>
              <div className="rounded-xl border border-sky-200/80 bg-sky-50/80 px-3 py-2 ring-1 ring-sky-100">
                <p className="text-[10px] font-bold uppercase text-sky-800">Net disbursed</p>
                <p className="text-lg font-bold text-sky-900">{fmtPhp(batchSummary.succeeded_net)}</p>
              </div>
              <div className="rounded-xl border border-rose-200/80 bg-rose-50/80 px-3 py-2 ring-1 ring-rose-100">
                <p className="text-[10px] font-bold uppercase text-rose-800">Withheld</p>
                <p className="text-lg font-bold text-rose-900">{fmtPhp(batchSummary.succeeded_withheld)}</p>
              </div>
            </div>
          )}
          <div className="px-4 py-3">
            <label className="text-xs font-semibold text-zinc-600">
              Batch status{" "}
              <select
                className={financeSelectCls}
                value={batchStatus}
                onChange={(e) => {
                  setBatchStatus(e.target.value);
                  setBatchPage(1);
                }}
              >
                <option value="">All</option>
                <option value="pending_submit">pending_submit</option>
                <option value="submitted">submitted</option>
                <option value="succeeded">succeeded</option>
                <option value="failed">failed</option>
              </select>
            </label>
          </div>
          {loading ? (
            <div className="p-4">
              <DashMobileTableSkeleton rows={5} />
            </div>
          ) : batchRows.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-zinc-500">No payout batches yet.</p>
          ) : (
            <>
              <div className="md:hidden space-y-3 p-4">
                {batchRows.map((b) => (
                  <DashMobileTableCard
                    key={b.id}
                    title={
                      <span className="inline-flex items-center gap-2 font-mono text-sm text-navy">
                        <BulkSelectMobile
                          checked={batchBulk.isSelected(b.id)}
                          onChange={() => batchBulk.toggle(b.id)}
                          ariaLabel={`Select batch ${b.id}`}
                        />
                        Batch #{b.id}
                      </span>
                    }
                    fields={[
                      { label: "Marketer", value: b.marketer?.name ?? String(b.marketer_id) },
                      { label: "Period", value: <span className="font-mono text-xs">{b.run_period}</span> },
                      { label: "Status", value: <StatusBadge status={b.status} /> },
                      { label: "Gross", value: fmtPhp(b.gross_commissions) },
                      { label: "Net out", value: fmtPhp(b.net_disbursed) },
                      { label: "Withheld", value: fmtPhp(b.withheld) },
                      {
                        label: "Xendit",
                        value: <span className="break-all font-mono text-xs">{b.xendit_payout_id ?? "—"}</span>,
                      },
                    ]}
                  />
                ))}
              </div>
              <div className="hidden md:block">
                <DashTableScrollRegion label="Withholding and payout batches table">
                  <table className="dash-table min-w-[1000px]">
                  <thead>
                    <tr>
                      <BulkSelectTh
                        checked={batchBulk.isAllSelected}
                        indeterminate={batchBulk.isSomeSelected}
                        onChange={() => (batchBulk.isAllSelected ? batchBulk.clear() : batchBulk.selectAll())}
                      />
                      <th>ID</th>
                      <th>Marketer</th>
                      <th>Period</th>
                      <th>Status</th>
                      <th>Bank</th>
                      <th>Gross</th>
                      <th>Net out</th>
                      <th>Withheld</th>
                      <th>Xendit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchRows.map((b) => (
                      <tr key={b.id}>
                        <BulkSelectTd
                          checked={batchBulk.isSelected(b.id)}
                          onChange={() => batchBulk.toggle(b.id)}
                          ariaLabel={`Select batch ${b.id}`}
                        />
                        <td className="font-mono text-xs">{b.id}</td>
                        <td className="text-sm">{b.marketer?.name ?? b.marketer_id}</td>
                        <td className="font-mono text-xs">{b.run_period}</td>
                        <td>
                          <StatusBadge status={b.status} />
                        </td>
                        <td className="text-xs text-zinc-600">
                          {b.bank_display_name ?? b.bank_channel_code ?? b.destination_type ?? "—"}
                          {b.bank_last4 ? ` ·••${b.bank_last4}` : ""}
                        </td>
                        <td className="font-mono text-sm">{fmtPhp(b.gross_commissions)}</td>
                        <td className="font-mono text-sm">{fmtPhp(b.net_disbursed)}</td>
                        <td className="font-mono text-sm text-rose-800">{fmtPhp(b.withheld)}</td>
                        <td className="max-w-[120px] truncate font-mono text-xs">{b.xendit_payout_id ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </DashTableScrollRegion>
              </div>
              <Paginate
                page={batchPage}
                lastPage={batchMeta.last_page}
                total={batchMeta.total}
                onPrev={() => setBatchPage((p) => Math.max(1, p - 1))}
                onNext={() => setBatchPage((p) => Math.min(batchMeta.last_page, p + 1))}
              />
            </>
          )}
        </DashCard>
      )}

      {tab === "releases" && (
        <DashCard className="overflow-hidden p-0">
          {loading ? (
            <div className="p-4">
              <DashMobileTableSkeleton rows={5} />
            </div>
          ) : relRows.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-zinc-500">No commission releases recorded.</p>
          ) : (
            <>
              <div className="md:hidden space-y-3 p-4">
                {relRows.map((r) => (
                  <DashMobileTableCard
                    key={r.id}
                    title={
                      <span className="inline-flex items-center gap-2">
                        <BulkSelectMobile
                          checked={relBulk.isSelected(r.id)}
                          onChange={() => relBulk.toggle(r.id)}
                          ariaLabel={`Select release ${r.id}`}
                        />
                        {fmtPhp(r.amount)}
                      </span>
                    }
                    fields={[
                      { label: "Released", value: new Date(r.released_at).toLocaleString() },
                      { label: "Source", value: <span className="capitalize">{r.release_source}</span> },
                      { label: "Marketer", value: r.commission?.marketer?.name ?? "—" },
                      { label: "Resort", value: r.commission?.resort?.name ?? "—" },
                      {
                        label: "Batch ref",
                        value: <span className="font-mono text-xs">{r.payout_batch?.reference_id ?? "—"}</span>,
                      },
                    ]}
                  />
                ))}
              </div>
              <div className="hidden md:block">
                <DashTableScrollRegion label="Commission release log table">
                  <table className="dash-table min-w-[880px]">
                  <thead>
                    <tr>
                      <BulkSelectTh
                        checked={relBulk.isAllSelected}
                        indeterminate={relBulk.isSomeSelected}
                        onChange={() => (relBulk.isAllSelected ? relBulk.clear() : relBulk.selectAll())}
                      />
                      <th>Released</th>
                      <th>Amount</th>
                      <th>Source</th>
                      <th>Marketer</th>
                      <th>Resort</th>
                      <th>Batch ref</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relRows.map((r) => (
                      <tr key={r.id}>
                        <BulkSelectTd
                          checked={relBulk.isSelected(r.id)}
                          onChange={() => relBulk.toggle(r.id)}
                          ariaLabel={`Select release ${r.id}`}
                        />
                        <td className="text-xs">{new Date(r.released_at).toLocaleString()}</td>
                        <td className="font-mono text-sm">{fmtPhp(r.amount)}</td>
                        <td className="text-xs capitalize">{r.release_source}</td>
                        <td className="text-sm">{r.commission?.marketer?.name ?? "—"}</td>
                        <td className="text-sm">{r.commission?.resort?.name ?? "—"}</td>
                        <td className="font-mono text-xs">{r.payout_batch?.reference_id ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </DashTableScrollRegion>
              </div>
              <Paginate
                page={relPage}
                lastPage={relMeta.last_page}
                total={relMeta.total}
                onPrev={() => setRelPage((p) => Math.max(1, p - 1))}
                onNext={() => setRelPage((p) => Math.min(relMeta.last_page, p + 1))}
              />
            </>
          )}
        </DashCard>
      )}

      {activeBulkTab ? (
        <ConfirmDialog
          open={confirmBulkDelete}
          title={bulkDeleteLabels[activeBulkTab].action}
          description={`Permanently remove ${activeBulk?.selectedCount ?? 0} ${bulkDeleteLabels[activeBulkTab].item}${(activeBulk?.selectedCount ?? 0) === 1 ? "" : "s"} from this page. ${bulkDeleteLabels[activeBulkTab].warning} This cannot be undone.`}
          confirmLabel="Delete selected"
          tone="danger"
          loading={bulkDeleting}
          onCancel={() => setConfirmBulkDelete(false)}
          onConfirm={() => void onFinanceBulkDelete()}
        />
      ) : null}
    </div>
  );
}
