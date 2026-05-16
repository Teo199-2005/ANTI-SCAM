"use client";

import AsyncStatePanel from "@/components/shared/AsyncStatePanel";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import DataTable from "@/components/shared/DataTable";
import SortableTh from "@/components/shared/SortableTh";
import TablePaginationBar from "@/components/shared/TablePaginationBar";
import {
  DashTableActionsCell,
  DashTableActionsHead,
  DashTableActionsInner,
} from "@/components/shared/DashTableActions";
import DashMobileTableCard, { DashMobileTableSkeleton } from "@/components/shared/DashMobileTableCard";
import { useToast } from "@/components/shared/ToastProvider";
import { apiClient } from "@/lib/api/client";
import LocationFilterBar, {
  emptyLocationFilter,
  locationFilterToParams,
  type LocationFilterValue,
} from "@/components/locations/LocationFilterBar";
import { getAdminSubscriptionOverview } from "@/lib/api/admin";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";
import { ResortItem } from "@/lib/api/resort";
import { triggerSubscriptionInvoice } from "@/lib/api/subscription";
import { CreditCard, RefreshCw } from "lucide-react";
import { formatSubscriptionStatusLabel } from "@/lib/billing/subscriptionStatus";
import { compareNullable, nextSort, paginateLocal, type SortDir } from "@/lib/tableSortPagination";
import { useEffect, useMemo, useState } from "react";
import { formatPhp } from "@/lib/formatPhp";

const SORT_FIRST: Record<string, SortDir> = {
  name: "asc",
  plan: "asc",
  rooms: "desc",
  monthly_fee: "desc",
  status: "asc",
  latest_invoice: "asc",
  next_due: "asc",
};

const statusBadge: Record<string, string> = {
  active:          "dash-badge-emerald",
  expired: "dash-badge-rose",
  cancelled:       "dash-badge-slate",
};

export default function AdminSubscriptionsPage() {
  const [resorts, setResorts] = useState<ResortItem[]>([]);
  const [latestInvoiceStatus, setLatestInvoiceStatus] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState<number | null>(null);
  const [triggering, setTriggering] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmRefresh, setConfirmRefresh] = useState<ResortItem | null>(null);
  const [confirmTrigger, setConfirmTrigger] = useState<ResortItem | null>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [sortBy, setSortBy] = useState<string>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [locationFilter, setLocationFilter] = useState<LocationFilterValue>(emptyLocationFilter);
  const { pushToast } = useToast();

  const load = async (loc: LocationFilterValue = locationFilter) => {
    setLoading(true);
    try {
      const overview = await getAdminSubscriptionOverview(locationFilterToParams(loc));
      setResorts(overview);
      setLatestInvoiceStatus(
        Object.fromEntries(overview.map((resort) => [resort.id, resort.latest_invoice_status ?? "none"])),
      );
      setError(null);
    } catch (err) {
      setResorts([]);
      setError("Failed to load subscriptions.");
    } finally {
      setLoading(false);
    }
  };

  const triggerInvoice = async (resort: ResortItem) => {
    setTriggering(resort.id);
    try {
      const result = await triggerSubscriptionInvoice(resort.id);
      pushToast({
        title: "Invoice triggered",
        description: `${resort.name} invoice created.`,
        tone: "success",
      });
      if (result.invoice_url) {
        pushToast({
          title: "Payment link ready",
          description: "Resort owner can complete payment using generated invoice link.",
          tone: "info",
        });
      }
      await load();
    } catch (err) {
      const msg = parseApiErrorMessage(err, "Unable to trigger subscription invoice.");
      pushToast({ title: "Trigger failed", description: msg, tone: "error" });
    } finally {
      setTriggering(null);
      setConfirmTrigger(null);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const sortedResorts = useMemo(() => {
    const copy = [...resorts];
    copy.sort((a, b) => {
      const subA = a.subscription;
      const subB = b.subscription;
      switch (sortBy) {
        case "name":
          return compareNullable(a.name, b.name, sortDir);
        case "plan":
          return compareNullable(subA?.plan ?? "", subB?.plan ?? "", sortDir);
        case "rooms":
          return compareNullable(subA?.active_room_count ?? 0, subB?.active_room_count ?? 0, sortDir);
        case "monthly_fee":
          return compareNullable(
            subA ? Number(subA.total_monthly_fee) : null,
            subB ? Number(subB.total_monthly_fee) : null,
            sortDir,
          );
        case "status":
          return compareNullable(subA?.status ?? "", subB?.status ?? "", sortDir);
        case "latest_invoice":
          return compareNullable(latestInvoiceStatus[a.id] ?? "", latestInvoiceStatus[b.id] ?? "", sortDir);
        case "next_due":
          return compareNullable(subA?.next_due_date ?? "", subB?.next_due_date ?? "", sortDir);
        default:
          return 0;
      }
    });
    return copy;
  }, [resorts, sortBy, sortDir, latestInvoiceStatus]);

  const { slice: pageResorts, meta: pageMeta } = useMemo(
    () => paginateLocal(sortedResorts, page, perPage),
    [sortedResorts, page, perPage],
  );

  const onSort = (key: string) => {
    const n = nextSort(key, sortBy, sortDir, SORT_FIRST[key] ?? "asc");
    setSortBy(n.key);
    setSortDir(n.dir);
    setPage(1);
  };

  const paginationFooter =
    sortedResorts.length > 0 ? (
      <TablePaginationBar
        page={pageMeta.current_page}
        lastPage={pageMeta.last_page}
        total={pageMeta.total}
        perPage={perPage}
        onPerPageChange={(pp) => {
          setPerPage(pp);
          setPage(1);
        }}
        onPageChange={setPage}
        disabled={loading}
      />
    ) : null;

  const refreshSub = async (resort: ResortItem) => {
    setRefreshing(resort.id);
    try {
      await apiClient.post(`/resorts/${resort.id}/subscriptions/refresh`);
      await load();
      pushToast({ title: "Subscription refreshed", description: `${resort.name} updated successfully.`, tone: "success" });
    } catch (err) {
      pushToast({ title: "Refresh failed", description: "Unable to refresh this subscription.", tone: "error" });
    } finally {
      setRefreshing(null);
      setConfirmRefresh(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="dash-page-title flex items-center gap-2">
          <CreditCard size={24} className="text-skyBlue" />
          Subscriptions
        </h1>
        <p className="dash-page-sub">Review and refresh billing subscriptions for all resorts.</p>
        <div className="dash-filter-bar">
          <LocationFilterBar
            label="Resort location"
            value={locationFilter}
            onChange={(next) => {
              setLocationFilter(next);
              setPage(1);
              void load(next);
            }}
          />
        </div>
      </div>

      <div className="md:hidden">
        {loading ? (
          <DashMobileTableSkeleton rows={5} />
        ) : error ? (
          <div className="dash-alert-error">{error}</div>
        ) : sortedResorts.length === 0 ? (
          <div className="rounded-2xl border border-softBorder bg-softCard p-8 text-center text-sm text-zinc-600">No resorts found.</div>
        ) : (
          <div className="space-y-3">
            {pageResorts.map((resort) => {
              const sub = resort.subscription;
              return (
                <DashMobileTableCard
                  key={resort.id}
                  title={resort.name}
                  fields={[
                    { label: "Plan", value: <span className="capitalize">{sub?.plan ?? "—"}</span> },
                    { label: "Active rooms", value: String(sub?.active_room_count ?? 0) },
                    {
                      label: "Monthly fee",
                      value: sub ? formatPhp(Number(sub.total_monthly_fee)) : "—",
                    },
                    {
                      label: "Status",
                      value: sub ? (
                        <span className={statusBadge[sub.status] ?? "dash-badge-slate"}>
                          {formatSubscriptionStatusLabel(sub.status)}
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-600">No subscription</span>
                      ),
                    },
                    {
                      label: "Latest invoice",
                      value: <span className="capitalize">{latestInvoiceStatus[resort.id] ?? "none"}</span>,
                    },
                    { label: "Next due", value: sub?.next_due_date ?? "—" },
                  ]}
                  actions={
                    <div className="flex w-full gap-2">
                      <button
                        type="button"
                        disabled={refreshing === resort.id}
                        onClick={() => setConfirmRefresh(resort)}
                        className="dash-btn-sm w-full justify-center"
                      >
                        <RefreshCw size={11} className={refreshing === resort.id ? "animate-spin" : ""} />
                        Refresh
                      </button>
                      <button
                        type="button"
                        disabled={triggering === resort.id}
                        onClick={() => setConfirmTrigger(resort)}
                        className="dash-btn-accent w-full justify-center"
                      >
                        Trigger
                      </button>
                    </div>
                  }
                />
              );
            })}
          </div>
        )}
        {paginationFooter ? <div className="dash-table-wrap overflow-hidden rounded-2xl">{paginationFooter}</div> : null}
      </div>

      <div className="hidden md:block">
        <DataTable
          footer={paginationFooter ?? undefined}
          headers={
            <>
              <SortableTh label="Resort" sortKey="name" activeKey={sortBy} direction={sortDir} onSort={onSort} />
              <SortableTh label="Plan" sortKey="plan" activeKey={sortBy} direction={sortDir} onSort={onSort} />
              <SortableTh label="Rooms" sortKey="rooms" activeKey={sortBy} direction={sortDir} onSort={onSort} />
              <SortableTh label="Monthly fee" sortKey="monthly_fee" activeKey={sortBy} direction={sortDir} onSort={onSort} />
              <SortableTh label="Status" sortKey="status" activeKey={sortBy} direction={sortDir} onSort={onSort} />
              <SortableTh label="Latest invoice" sortKey="latest_invoice" activeKey={sortBy} direction={sortDir} onSort={onSort} />
              <SortableTh label="Next due" sortKey="next_due" activeKey={sortBy} direction={sortDir} onSort={onSort} />
              <DashTableActionsHead srOnly>Row actions</DashTableActionsHead>
            </>
          }
        >
          <AsyncStatePanel
            loading={loading}
            error={error}
            isEmpty={sortedResorts.length === 0}
            emptyText="No resorts found."
            withinTable
            colSpan={8}
          >
            {pageResorts.map((resort) => {
              const sub = resort.subscription;
              return (
                <tr key={resort.id} className="group">
                  <td className="font-semibold text-navy">{resort.name}</td>
                  <td className="capitalize text-zinc-700">{sub?.plan ?? "—"}</td>
                  <td className="text-zinc-600">{sub?.active_room_count ?? 0}</td>
                  <td className="text-zinc-700">
                    {sub ? formatPhp(Number(sub.total_monthly_fee)) : "—"}
                  </td>
                  <td>
                    {sub ? (
                      <span className={statusBadge[sub.status] ?? "dash-badge-slate"}>
                        {formatSubscriptionStatusLabel(sub.status)}
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-600">No subscription</span>
                    )}
                  </td>
                  <td className="capitalize text-zinc-700">{latestInvoiceStatus[resort.id] ?? "none"}</td>
                  <td className="text-zinc-600">{sub?.next_due_date ?? "—"}</td>
                  <DashTableActionsCell>
                    <DashTableActionsInner>
                      <button
                        type="button"
                        disabled={refreshing === resort.id}
                        onClick={() => setConfirmRefresh(resort)}
                        className="dash-btn-sm"
                      >
                        <RefreshCw size={11} className={refreshing === resort.id ? "animate-spin" : ""} />
                        Refresh
                      </button>
                      <button
                        type="button"
                        disabled={triggering === resort.id}
                        onClick={() => setConfirmTrigger(resort)}
                        className="dash-btn-accent"
                      >
                        Trigger Invoice
                      </button>
                    </DashTableActionsInner>
                  </DashTableActionsCell>
                </tr>
              );
            })}
          </AsyncStatePanel>
        </DataTable>
      </div>

      <ConfirmDialog
        open={Boolean(confirmRefresh)}
        title="Refresh subscription calculation?"
        description={
          confirmRefresh
            ? `Recalculate billing for ${confirmRefresh.name} using current active room count.`
            : "Recalculate billing."
        }
        confirmLabel="Refresh"
        loading={refreshing !== null}
        onCancel={() => setConfirmRefresh(null)}
        onConfirm={() => {
          if (confirmRefresh) void refreshSub(confirmRefresh);
        }}
      />
      <ConfirmDialog
        open={Boolean(confirmTrigger)}
        title="Trigger subscription invoice?"
        description={
          confirmTrigger
            ? `Create a payment invoice now for ${confirmTrigger.name}.`
            : "Create a payment invoice."
        }
        confirmLabel="Trigger invoice"
        loading={triggering !== null}
        onCancel={() => setConfirmTrigger(null)}
        onConfirm={() => {
          if (confirmTrigger) void triggerInvoice(confirmTrigger);
        }}
      />
    </div>
  );
}

