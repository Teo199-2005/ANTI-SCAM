"use client";

import LocationFilterBar, {
  emptyLocationFilter,
  locationFilterToParams,
  type LocationFilterValue,
} from "@/components/locations/LocationFilterBar";
import { listResorts, ResortItem, updateResort } from "@/lib/api/resort";
import { setResortVip } from "@/lib/api/admin";
import { bulkDeleteResorts, bulkDeleteToastDescriptionGeneric } from "@/lib/api/bulkDelete";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";
import BulkActionBar from "@/components/shared/BulkActionBar";
import { BulkSelectMobile, BulkSelectTd, BulkSelectTh } from "@/components/shared/BulkSelectCheckbox";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { SubscriptionPlanLabel } from "@/components/badges/SubscriptionPlanLabel";
import AsyncStatePanel from "@/components/shared/AsyncStatePanel";
import DataTable from "@/components/shared/DataTable";
import {
  DashTableActionsCell,
  DashTableActionsHead,
  DashTableActionsInner,
} from "@/components/shared/DashTableActions";
import DashMobileTableCard, { DashMobileTableSkeleton } from "@/components/shared/DashMobileTableCard";
import SortableTh from "@/components/shared/SortableTh";
import TablePaginationBar from "@/components/shared/TablePaginationBar";
import { useToast } from "@/components/shared/ToastProvider";
import AdminResortViewModal from "@/components/dashboard/AdminResortViewModal";
import { formatSubscriptionStatusLabel } from "@/lib/billing/subscriptionStatus";
import DashboardFilterSearch from "@/components/dashboard/DashboardFilterSearch";
import { TableEntityThumb } from "@/components/shared/TableEntityThumb";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { BadgeCheck, Building2, Crown, Eye, PenLine, XCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { sanitizeSearchQuery } from "@/lib/inputRestrictions";
import { cn } from "@/lib/utils";
import { extractLaravelMeta, nextSort, type LaravelTableMeta, type SortDir } from "@/lib/tableSortPagination";

const SORT_FIRST: Record<string, SortDir> = {
  name: "asc",
  address_label: "asc",
  created_at: "desc",
};

const subBadge = (status: string) => {
  if (status === "active") return "dash-badge-emerald";
  if (status === "expired") return "dash-badge-rose";
  if (status === "cancelled") return "dash-badge-slate";
  return "dash-badge-amber";
};

export default function AdminResortsPage() {
  const [resorts, setResorts] = useState<ResortItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [toggling, setToggling] = useState<number | null>(null);
  const [togglingVip, setTogglingVip] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<LaravelTableMeta | null>(null);
  const [perPage, setPerPage] = useState(15);
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [locationFilter, setLocationFilter] = useState<LocationFilterValue>(emptyLocationFilter);
  const [viewResortId, setViewResortId] = useState<number | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const { pushToast } = useToast();

  const bulk = useBulkSelection(resorts, (r) => r.id);

  const load = async (
    s: string,
    pg: number,
    pp: number,
    sb: string,
    sd: SortDir,
    loc: LocationFilterValue = locationFilter,
  ) => {
    setLoading(true);
    try {
      const res = await listResorts({
        search: s || undefined,
        perPage: pp,
        page: pg,
        sort_by: sb,
        sort_dir: sd,
        ...locationFilterToParams(loc),
      });
      setResorts(res.data ?? []);
      setMeta(extractLaravelMeta(res));
      setError(null);
    } catch (err) {
      setResorts([]);
      setMeta(null);
      setError("Failed to load resorts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load("", 1, perPage, sortBy, sortDir);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lastPage = meta?.last_page ?? 1;
  const total = meta?.total ?? resorts.length;

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(query);
    setPage(1);
    void load(query, 1, perPage, sortBy, sortDir);
  };

  const onSort = (key: string) => {
    const n = nextSort(key, sortBy, sortDir, SORT_FIRST[key] ?? "asc");
    setSortBy(n.key);
    setSortDir(n.dir);
    setPage(1);
    void load(search, 1, perPage, n.key, n.dir);
  };

  const onPageChange = (p: number) => {
    setPage(p);
    void load(search, p, perPage, sortBy, sortDir);
  };

  const onPerPageChange = (pp: number) => {
    setPerPage(pp);
    setPage(1);
    void load(search, 1, pp, sortBy, sortDir);
  };

  const paginationFooter = !error && (
    <TablePaginationBar
      page={page}
      lastPage={lastPage}
      total={total}
      perPage={perPage}
      onPerPageChange={onPerPageChange}
      onPageChange={onPageChange}
      disabled={loading}
    />
  );

  const toggleListed = async (resort: ResortItem) => {
    setToggling(resort.id);
    try {
      await updateResort(resort.id, { is_publicly_listed: !resort.is_publicly_listed });
      setResorts((prev) =>
        prev.map((r) => (r.id === resort.id ? { ...r, is_publicly_listed: !r.is_publicly_listed } : r)),
      );
      pushToast({
        title: resort.is_publicly_listed ? "Resort unlisted" : "Resort listed",
        tone: "success",
      });
    } catch (err) {
      pushToast({
        title: "Update failed",
        description: parseApiErrorMessage(err, "Could not update listing visibility."),
        tone: "error",
      });
    } finally {
      setToggling(null);
    }
  };

  const onBulkDelete = async () => {
    const ids = bulk.selectedIds.map((id) => Number(id)).filter((id) => id > 0);
    if (ids.length === 0) return;
    setBulkDeleting(true);
    try {
      const result = await bulkDeleteResorts(ids);
      await load(search, page, perPage, sortBy, sortDir);
      bulk.clear();
      pushToast({
        title: result.failed.length ? "Bulk delete completed with errors" : "Resorts deleted",
        description: bulkDeleteToastDescriptionGeneric(result, "resort"),
        tone: result.failed.length ? "warning" : "success",
      });
    } catch (err) {
      pushToast({
        title: "Bulk delete failed",
        description: parseApiErrorMessage(err, "Unable to delete selected resorts."),
        tone: "error",
      });
    } finally {
      setBulkDeleting(false);
      setConfirmBulkDelete(false);
    }
  };

  const toggleVip = async (resort: ResortItem) => {
    setTogglingVip(resort.id);
    const newVip = !resort.is_vip;
    try {
      await setResortVip(resort.id, newVip);
      setResorts((prev) => prev.map((r) => (r.id === resort.id ? { ...r, is_vip: newVip } : r)));
      pushToast({ title: newVip ? "VIP badge granted" : "VIP badge removed", tone: "success" });
    } catch (err) {
      pushToast({
        title: "VIP update failed",
        description: parseApiErrorMessage(err, "Could not update VIP status."),
        tone: "error",
      });
    } finally {
      setTogglingVip(null);
    }
  };

  const subscriptionCell = (resort: ResortItem) =>
    resort.subscription ? (
      <span className={cn(subBadge(resort.subscription.status), "inline-flex flex-wrap items-center gap-1.5")}>
        <span>{formatSubscriptionStatusLabel(resort.subscription.status)}</span>
        <span className="text-zinc-400">·</span>
        <SubscriptionPlanLabel plan={resort.subscription.plan} />
      </span>
    ) : (
      <span className="text-zinc-600">—</span>
    );

  const listedToggle = (resort: ResortItem) => (
    <button
      type="button"
      disabled={toggling === resort.id}
      onClick={() => toggleListed(resort)}
      aria-label={resort.is_publicly_listed ? "Unlist resort" : "List resort publicly"}
      data-action-label={resort.is_publicly_listed ? "Unlist resort" : "List resort publicly"}
      className="dash-action-icon border border-softBorder bg-softGray/50 text-navy transition hover:bg-softGray disabled:opacity-50"
    >
      {resort.is_publicly_listed ? (
        <BadgeCheck size={20} className="text-emerald-500" />
      ) : (
        <XCircle size={20} className="text-zinc-600" />
      )}
    </button>
  );

  const vipToggle = (resort: ResortItem) => (
    <button
      type="button"
      disabled={togglingVip === resort.id}
      onClick={() => void toggleVip(resort)}
      aria-label={resort.is_vip ? "Remove VIP badge" : "Grant VIP badge"}
      data-action-label={resort.is_vip ? "Remove VIP badge" : "Grant VIP badge"}
      className="dash-action-icon border border-softBorder bg-softGray/50 text-navy transition hover:bg-softGray disabled:opacity-50"
    >
      {resort.is_vip ? (
        <Crown size={20} className="fill-amber-400 text-amber-400" aria-hidden />
      ) : (
        <Crown size={20} className="text-zinc-300" />
      )}
    </button>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="dash-page-title flex items-center gap-2">
          <Building2 size={24} className="text-skyBlue" />
          All resorts
        </h1>
        <p className="dash-page-sub">Manage all resorts across every tenant.</p>

        <form onSubmit={onSearch} className="dash-filter-bar">
          <DashboardFilterSearch
            value={query}
            onChange={(v) => setQuery(sanitizeSearchQuery(v))}
            placeholder="Search by name…"
          />
          <LocationFilterBar
            label="Resort location"
            value={locationFilter}
            onChange={(next) => {
              setLocationFilter(next);
              setPage(1);
              void load(search, 1, perPage, sortBy, sortDir, next);
            }}
          />
        </form>
        {search ? <p className="mt-2 text-xs text-zinc-600">Results for &quot;{search}&quot;</p> : null}
      </div>

      <BulkActionBar
        count={bulk.selectedCount}
        onClear={bulk.clear}
        onDelete={() => setConfirmBulkDelete(true)}
        deleting={bulkDeleting}
        deleteLabel="Delete selected resorts"
      />

      {/* Mobile: stacked cards (no horizontal table scroll) */}
      <div className="md:hidden">
        {loading ? (
          <DashMobileTableSkeleton rows={5} />
        ) : error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-800">{error}</div>
        ) : resorts.length === 0 ? (
          <div className="rounded-2xl border border-softBorder bg-softCard p-8 text-center text-sm text-zinc-600">No resorts found.</div>
        ) : (
          <div className="space-y-3">
            {resorts.map((resort) => (
              <DashMobileTableCard
                key={resort.id}
                title={
                  <span className="inline-flex items-center gap-2">
                    <BulkSelectMobile
                      checked={bulk.isSelected(resort.id)}
                      onChange={() => bulk.toggle(resort.id)}
                      ariaLabel={`Select ${resort.name}`}
                    />
                    <TableEntityThumb imageUrl={resort.logo_url} name={resort.name} kind="resort" />
                    <span>{resort.name}</span>
                  </span>
                }
                fields={[
                  { label: "Address", value: resort.address ?? "—" },
                  { label: "Subscription", value: subscriptionCell(resort) },
                  {
                    label: "Listed",
                    value: (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-zinc-600">
                          {resort.is_publicly_listed ? "Public on platform" : "Not listed"}
                        </span>
                        {listedToggle(resort)}
                      </div>
                    ),
                  },
                  {
                    label: "VIP",
                    value: (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-zinc-600">{resort.is_vip ? "VIP resort" : "Standard"}</span>
                        {vipToggle(resort)}
                      </div>
                    ),
                  },
                ]}
                actions={
                  <>
                    <button
                      type="button"
                      className="dash-btn-sm w-full justify-center"
                      onClick={() => setViewResortId(resort.id)}
                    >
                      <Eye size={14} />
                      View
                    </button>
                    <Link
                      href={`/dashboard/admin/onboard?resort_id=${resort.id}`}
                      className="dash-btn-sm w-full justify-center"
                    >
                      <PenLine size={14} />
                      Edit resort
                    </Link>
                  </>
                }
              />
            ))}
          </div>
        )}
        {paginationFooter ? <div className="dash-table-wrap overflow-hidden rounded-2xl">{paginationFooter}</div> : null}
      </div>

      {/* Desktop: wide table */}
      <div className="hidden md:block">
        <DataTable
          footer={paginationFooter}
          leadingHeader={
            <BulkSelectTh
              checked={bulk.isAllSelected}
              indeterminate={bulk.isSomeSelected}
              onChange={() => (bulk.isAllSelected ? bulk.clear() : bulk.selectAll())}
              disabled={loading || resorts.length === 0}
            />
          }
          headers={
            <>
              <SortableTh label="Name" sortKey="name" activeKey={sortBy} direction={sortDir} onSort={onSort} />
              <SortableTh label="Address" sortKey="address_label" activeKey={sortBy} direction={sortDir} onSort={onSort} />
              <SortableTh label="Added" sortKey="created_at" activeKey={sortBy} direction={sortDir} onSort={onSort} />
              <th>Subscription</th>
              <th>Listed</th>
              <th>VIP</th>
              <DashTableActionsHead />
            </>
          }
        >
          <AsyncStatePanel loading={loading} error={error} isEmpty={resorts.length === 0} emptyText="No resorts found." withinTable colSpan={8}>
            {resorts.map((resort) => (
              <tr key={resort.id} className="group">
                <BulkSelectTd
                  checked={bulk.isSelected(resort.id)}
                  onChange={() => bulk.toggle(resort.id)}
                  ariaLabel={`Select ${resort.name}`}
                />
                <td>
                  <div className="flex items-center gap-3">
                    <TableEntityThumb imageUrl={resort.logo_url} name={resort.name} kind="resort" />
                    <span className="font-semibold text-navy">{resort.name}</span>
                  </div>
                </td>
                <td className="text-zinc-600">{resort.address ?? "—"}</td>
                <td className="text-xs text-zinc-500 whitespace-nowrap">
                  {resort.created_at ? new Date(resort.created_at).toLocaleDateString() : "—"}
                </td>
                <td>{subscriptionCell(resort)}</td>
                <td>
                  <button
                    type="button"
                    disabled={toggling === resort.id}
                    onClick={() => toggleListed(resort)}
                    aria-label={resort.is_publicly_listed ? "Unlist resort" : "List resort publicly"}
                    data-action-label={resort.is_publicly_listed ? "Unlist resort" : "List resort publicly"}
                    className="dash-action-icon text-navy transition hover:scale-110 disabled:opacity-50"
                  >
                    {resort.is_publicly_listed ? (
                      <BadgeCheck size={18} className="text-emerald-500" />
                    ) : (
                      <XCircle size={18} className="text-zinc-600" />
                    )}
                  </button>
                </td>
                <td>
                  <button
                    type="button"
                    disabled={togglingVip === resort.id}
                    onClick={() => void toggleVip(resort)}
                    aria-label={resort.is_vip ? "Remove VIP badge" : "Grant VIP badge"}
                    data-action-label={resort.is_vip ? "Remove VIP badge" : "Grant VIP badge"}
                    className="dash-action-icon text-navy transition hover:scale-110 disabled:opacity-50"
                  >
                    {resort.is_vip ? (
                      <Crown size={18} className="fill-amber-400 text-amber-400" aria-hidden />
                    ) : (
                      <Crown size={18} className="text-zinc-300" />
                    )}
                  </button>
                </td>
                <DashTableActionsCell>
                  <DashTableActionsInner>
                    <button type="button" className="dash-btn-sm" onClick={() => setViewResortId(resort.id)}>
                      <Eye size={14} />
                      View
                    </button>
                    <Link href={`/dashboard/admin/onboard?resort_id=${resort.id}`} className="dash-btn-sm">
                      <PenLine size={14} />
                      Edit
                    </Link>
                  </DashTableActionsInner>
                </DashTableActionsCell>
              </tr>
            ))}
          </AsyncStatePanel>
        </DataTable>
      </div>

      <ConfirmDialog
        open={confirmBulkDelete}
        title="Delete selected resorts?"
        description={`Delete ${bulk.selectedCount} resort${bulk.selectedCount === 1 ? "" : "s"} and their workspace data. When a tenant has no resorts left, the resort owner login${bulk.selectedCount === 1 ? " is" : "s are"} removed too. This cannot be undone.`}
        confirmLabel="Delete selected"
        tone="danger"
        loading={bulkDeleting}
        onCancel={() => setConfirmBulkDelete(false)}
        onConfirm={() => void onBulkDelete()}
      />

      <AdminResortViewModal
        resortId={viewResortId}
        open={viewResortId != null}
        onClose={() => setViewResortId(null)}
      />
    </div>
  );
}

