"use client";

import BulkActionBar from "@/components/shared/BulkActionBar";
import { BulkSelectMobile, BulkSelectTd, BulkSelectTh } from "@/components/shared/BulkSelectCheckbox";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import RoomModal, { RoomFormValues } from "@/components/dashboard/RoomModal";
import DashModal from "@/components/dash/DashModal";
import AsyncStatePanel from "@/components/shared/AsyncStatePanel";
import {
  DashTableActionsCell,
  DashTableActionsHead,
  DashTableActionsInner,
} from "@/components/shared/DashTableActions";
import DashMobileTableCard from "@/components/shared/DashMobileTableCard";
import DataTable from "@/components/shared/DataTable";
import SortableTh from "@/components/shared/SortableTh";
import TablePaginationBar from "@/components/shared/TablePaginationBar";
import { useToast } from "@/components/shared/ToastProvider";
import { apiClient } from "@/lib/api/client";
import type { ApiEnvelope } from "@/lib/api/types";
import { listResorts, ResortItem } from "@/lib/api/resort";
import { BusinessProVerifiedBadge } from "@/components/badges/BusinessProVerifiedBadge";
import { isBusinessProPlan, SUBSCRIPTION_PLANS } from "@/lib/subscriptionPlans";
import { bulkDeleteRooms, bulkDeleteToastDescription } from "@/lib/api/bulkDelete";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { buildStoredAmenitiesArray } from "@/lib/roomInclusions";
import { extractLaravelMeta, nextSort, type LaravelTableMeta, type SortDir } from "@/lib/tableSortPagination";
import {
  BedDouble,
  CalendarDays,
  CheckCircle2,
  Loader2,
  PackagePlus,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatPhp, formatPhpLedger } from "@/lib/formatPhp";

type RoomItem = {
  id: number;
  resort_id: number;
  name: string;
  code: string | null;
  capacity: number;
  units?: number;
  base_price: string;
  amenities: string[];
  rules: string | null;
  status: "active" | "inactive" | "maintenance";
};

type RoomsListBody = {
  data: RoomItem[];
  meta?: Record<string, unknown>;
  resort_room_counts?: { active: number; total: number };
};

const SORT_FIRST: Record<string, SortDir> = {
  name: "asc",
  code: "asc",
  capacity: "desc",
  units: "desc",
  base_price: "asc",
  status: "asc",
  created_at: "desc",
  id: "asc",
};

const roomStatusClass: Record<string, string> = {
  active:      "dash-badge-emerald",
  inactive:    "dash-badge-slate",
  maintenance: "dash-badge-orange",
};

export default function ResortRoomsPage() {
  const [resort, setResort] = useState<ResortItem | null>(null);
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [listReady, setListReady] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [meta, setMeta] = useState<LaravelTableMeta | null>(null);
  const [roomCounts, setRoomCounts] = useState<{ active: number; total: number } | null>(null);
  const [sortBy, setSortBy] = useState<string>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [confirmDelete, setConfirmDelete] = useState<RoomItem | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  /** After POST /rooms succeeds, we keep the modal open with this id for the Photos tab. */
  const [createRoomId, setCreateRoomId] = useState<number | null>(null);
  const [createModalTab, setCreateModalTab] = useState<"details" | "images">("details");
  const [createSaving, setCreateSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { pushToast } = useToast();
  const bulk = useBulkSelection(rooms, (r) => r.id);

  const hydrateResort = async (): Promise<ResortItem | null> => {
    const resorts = await listResorts({ perPage: 10 });
    const first = resorts.data[0] ?? null;
    setResort(first);
    return first;
  };

  const applyRoomsPayload = (payload: unknown, resortId: number) => {
    if (Array.isArray(payload)) {
      setRooms(payload.filter((room) => Number(room.resort_id) === resortId));
      setMeta(null);
      setRoomCounts(null);
      return;
    }
    const inner = payload as {
      data?: RoomItem[];
      resort_room_counts?: { active: number; total: number };
    };
    const rows = inner.data ?? [];
    setRooms(rows.filter((room) => Number(room.resort_id) === resortId));
    setMeta(extractLaravelMeta(payload));
    setRoomCounts(inner.resort_room_counts ?? null);
  };

  const loadRoomsTable = async (resortId: number, pg: number, pp: number, sb: string, sd: SortDir) => {
    const { data } = await apiClient.get<ApiEnvelope<RoomsListBody | RoomItem[]>>("/rooms", {
      params: { resort_id: resortId, page: pg, perPage: pp, sort_by: sb, sort_dir: sd },
    });
    applyRoomsPayload(data.data, resortId);
    setError(null);
  };

  const refetchRooms = async (resortId: number, pg: number, pp: number, sb: string, sd: SortDir) => {
    setLoading(true);
    try {
      await loadRoomsTable(resortId, pg, pp, sb, sd);
    } catch (err) {
      setRooms([]);
      setMeta(null);
      setRoomCounts(null);
      setError(parseApiErrorMessage(err, "Unable to load room inventory."));
    } finally {
      setLoading(false);
    }
  };

  const bootstrap = async () => {
    setLoading(true);
    setListReady(false);
    try {
      const first = await hydrateResort();
      if (!first?.id) {
        setRooms([]);
        setMeta(null);
        setRoomCounts(null);
        setError("no_resort_workspace");
        return;
      }
      await loadRoomsTable(first.id, 1, perPage, sortBy, sortDir);
      setPage(1);
      setError(null);
    } catch (err) {
      setRooms([]);
      setMeta(null);
      setRoomCounts(null);
      setError(parseApiErrorMessage(err, "Unable to load room inventory."));
    } finally {
      setLoading(false);
      setListReady(true);
    }
  };

  useEffect(() => {
    void bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lastPage = meta?.last_page ?? 1;
  const totalRows = meta?.total ?? rooms.length;

  const onSort = (key: string) => {
    const n = nextSort(key, sortBy, sortDir, SORT_FIRST[key] ?? "asc");
    setSortBy(n.key);
    setSortDir(n.dir);
    setPage(1);
    if (resort?.id) void refetchRooms(resort.id, 1, perPage, n.key, n.dir);
  };

  const onPageChange = (p: number) => {
    setPage(p);
    if (resort?.id) void refetchRooms(resort.id, p, perPage, sortBy, sortDir);
  };

  const onPerPageChange = (pp: number) => {
    setPerPage(pp);
    setPage(1);
    if (resort?.id) void refetchRooms(resort.id, 1, pp, sortBy, sortDir);
  };

  const activeRoomsCount =
    roomCounts?.active ??
    (typeof resort?.subscription?.active_room_count === "number" ? resort.subscription.active_room_count : null) ??
    rooms.filter((r) => r.status === "active").length;
  const totalRoomsCount =
    roomCounts?.total ??
    (typeof resort?.rooms_count === "number" ? resort.rooms_count : null) ??
    meta?.total ??
    rooms.length;
  const isBusinessPro = isBusinessProPlan(resort?.subscription?.plan, resort?.subscription?.status);
  const includedRooms =
    resort?.subscription?.included_rooms ??
    (isBusinessPro ? SUBSCRIPTION_PLANS.business_pro.maxRooms : SUBSCRIPTION_PLANS.standard.maxRooms);
  const slotsRemaining = Math.max(0, includedRooms - activeRoomsCount);
  const atIncludedRoomLimit = resort ? activeRoomsCount >= includedRooms : false;
  const showUpgradeCta = !isBusinessPro;

  const openUpgradeModal = () => {
    window.dispatchEvent(new Event("subscription:open-upgrade"));
  };

  const onDelete = async (roomId: number) => {
    try {
      await apiClient.delete(`/rooms/${roomId}`);
      const r = await hydrateResort();
      if (r?.id) await refetchRooms(r.id, page, perPage, sortBy, sortDir);
      bulk.clear();
      pushToast({ title: "Room deleted", tone: "success" });
    } catch (err) {
      pushToast({ title: "Delete failed", description: parseApiErrorMessage(err, "Unable to delete room."), tone: "error" });
    } finally {
      setConfirmDelete(null);
    }
  };

  const onBulkDelete = async () => {
    const ids = bulk.selectedIds.map((id) => Number(id)).filter((id) => id > 0);
    if (ids.length === 0) return;
    setBulkDeleting(true);
    try {
      const result = await bulkDeleteRooms(ids);
      const r = await hydrateResort();
      if (r?.id) await refetchRooms(r.id, page, perPage, sortBy, sortDir);
      bulk.clear();
      pushToast({
        title: result.failed.length ? "Bulk delete completed with errors" : "Rooms deleted",
        description: bulkDeleteToastDescription(result),
        tone: result.failed.length ? "warning" : "success",
      });
    } catch (err) {
      pushToast({
        title: "Bulk delete failed",
        description: parseApiErrorMessage(err, "Unable to delete selected rooms."),
        tone: "error",
      });
    } finally {
      setBulkDeleting(false);
      setConfirmBulkDelete(false);
    }
  };

  const onCreateRoom = async (values: RoomFormValues) => {
    setCreateSaving(true);
    try {
      const amenities = buildStoredAmenitiesArray(values);

      if (createRoomId != null) {
        await apiClient.put<ApiEnvelope<RoomItem>>(`/rooms/${createRoomId}`, {
          name: values.name,
          code: null,
          capacity: values.capacity,
          units: values.units,
          base_price: values.base_price,
          amenities,
          rules: values.rules || null,
          status: values.status,
        });
        pushToast({ title: "Room updated", description: "Details saved.", tone: "success" });
        try {
          const r = await hydrateResort();
          if (r?.id) await refetchRooms(r.id, page, perPage, sortBy, sortDir);
        } catch {
          // ignore
        }
        return;
      }

      const response = await apiClient.post<ApiEnvelope<RoomItem>>("/rooms", {
        resort_id: values.resort_id,
        name: values.name,
        code: null,
        capacity: values.capacity,
        units: values.units,
        base_price: values.base_price,
        amenities,
        rules: values.rules || null,
        status: values.status,
      });
      const created = (response.data?.data ?? null) as RoomItem | null;
      if (created?.id) {
        setCreateRoomId(created.id);
        setCreateModalTab("images");
        pushToast({
          title: "Room saved",
          description: "Add up to 5 photos for your landing page and guest views, then close when finished.",
          tone: "success",
        });
      } else {
        pushToast({
          title: "Room saved",
          description: `${values.name} is now in your room list.`,
          tone: "success",
        });
        setCreateOpen(false);
      }
      try {
        const r = await hydrateResort();
        if (r?.id) {
          setPage(1);
          await refetchRooms(r.id, 1, perPage, sortBy, sortDir);
        }
      } catch {
        // Keep success toast shown even if refresh request fails.
      }
    } catch (err) {
      pushToast({
        title: "Could not save room",
        description: parseApiErrorMessage(err, "Unable to save room details."),
        tone: "error",
      });
    } finally {
      setCreateSaving(false);
    }
  };


  const paginationFooter =
    error !== "no_resort_workspace" && meta && resort ? (
      <TablePaginationBar
        page={page}
        lastPage={lastPage}
        total={totalRows}
        perPage={perPage}
        onPerPageChange={onPerPageChange}
        onPageChange={onPageChange}
        disabled={loading}
      />
    ) : null;

  if (!listReady) {
    return <div className="dash-card p-8 text-center text-zinc-600">Loading rooms…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="dash-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="dash-page-title">Room management</h1>
            <p className="dash-page-sub">Add, edit, and maintain room statuses and pricing.</p>
          </div>
          {!resort?.subscription ? (
            <div className="flex shrink-0 flex-wrap items-center gap-3">
              {!resort || activeRoomsCount >= includedRooms ? (
                <button
                  type="button"
                  className="dash-btn-primary inline-flex items-center gap-2 opacity-50"
                  disabled
                  aria-label="Included room limit reached"
                >
                  <Plus size={15} />
                  Add
                </button>
              ) : (
                <button
                  type="button"
                  className="dash-btn-primary inline-flex items-center gap-2"
                  aria-label="Add new room"
                  onClick={() => {
                    setCreateRoomId(null);
                    setCreateModalTab("details");
                    setCreateOpen(true);
                  }}
                >
                  <Plus size={15} />
                  Add
                </button>
              )}
              {atIncludedRoomLimit && showUpgradeCta ? (
                <div className="flex max-w-md flex-wrap items-center gap-2 text-sm text-zinc-600">
                  <span>
                    You&apos;ve reached your plan&apos;s active room limit ({includedRooms}). Upgrade to Business Pro for up to 20 rooms.
                  </span>
                  <button
                    type="button"
                    onClick={openUpgradeModal}
                    className="inline-flex items-center gap-2 rounded-lg border border-primaryBlue/20 bg-primaryBlue/10 px-3 py-1.5 text-xs font-semibold text-primaryBlue hover:bg-primaryBlue/15 disabled:opacity-60"
                  >
                    <BusinessProVerifiedBadge size="xs" />
                    Upgrade to Business Pro
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
        {resort?.subscription ? (
          <div className="mt-4 flex flex-wrap items-start justify-between gap-3 rounded-xl border border-softBorder bg-softCard/80 px-4 py-3">
            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-1">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-900">
                <BedDouble size={18} className="shrink-0 text-skyBlue" aria-hidden />
                Plan room capacity
              </span>
              <p className="text-sm text-zinc-700">
                <span className="font-medium text-zinc-900">{activeRoomsCount}</span> active
                {totalRoomsCount !== activeRoomsCount ? (
                  <>
                    {" "}
                    (<span className="tabular-nums">{totalRoomsCount}</span> total listed)
                  </>
                ) : null}{" "}
                of{" "}
                <span className="font-medium text-zinc-900">
                  {includedRooms}
                </span>{" "}
                included
                {slotsRemaining !== null ? (
                  <>
                    {" "}
                    ·{" "}
                    {slotsRemaining > 0 ? (
                      <span className="font-medium text-emerald-800">
                        {slotsRemaining} slot{slotsRemaining === 1 ? "" : "s"} available
                      </span>
                    ) : isBusinessPro ? (
                      <span className="font-medium text-amber-900">
                        At plan limit ({includedRooms} active rooms max)
                      </span>
                    ) : (
                      <span className="font-medium text-amber-900">At plan limit — upgrade for more rooms</span>
                    )}
                  </>
                ) : null}
              </p>
              {showUpgradeCta ? (
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6">
                  <button
                    type="button"
                    onClick={openUpgradeModal}
                    disabled={!resort?.subscription}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-primaryBlue/25 bg-primaryBlue/10 px-3 py-2 text-xs font-semibold text-primaryBlue shadow-sm transition hover:bg-primaryBlue/15 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  >
                    <BusinessProVerifiedBadge size="xs" />
                    Upgrade to Business Pro
                  </button>
                </div>
              ) : null}
            </div>
            <div className="flex w-full shrink-0 flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-3">
              {!resort || activeRoomsCount >= includedRooms ? (
                <button
                  type="button"
                  className="dash-btn-primary inline-flex items-center justify-center gap-2 opacity-50 sm:justify-start"
                  disabled
                  aria-label="Included room limit reached"
                >
                  <Plus size={15} />
                  Add
                </button>
              ) : (
                <button
                  type="button"
                  className="dash-btn-primary inline-flex items-center justify-center gap-2 sm:justify-start"
                  aria-label="Add new room"
                  onClick={() => {
                    setCreateRoomId(null);
                    setCreateModalTab("details");
                    setCreateOpen(true);
                  }}
                >
                  <Plus size={15} />
                  Add
                </button>
              )}
              {atIncludedRoomLimit && showUpgradeCta ? (
                <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-600 sm:max-w-xs">
                  <span>
                    You&apos;ve reached your plan&apos;s active room limit ({includedRooms}). Upgrade to Business Pro for up to 20 rooms.
                  </span>
                  <button
                    type="button"
                    onClick={openUpgradeModal}
                    className="inline-flex items-center gap-2 rounded-lg border border-primaryBlue/20 bg-primaryBlue/10 px-3 py-1.5 text-xs font-semibold text-primaryBlue hover:bg-primaryBlue/15 disabled:opacity-60"
                  >
                    <BusinessProVerifiedBadge size="xs" />
                    Upgrade to Business Pro
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
        {error === "no_resort_workspace" ? (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <p className="font-semibold text-amber-950">No resort property yet</p>
            <p className="mt-1 leading-relaxed text-amber-900/95">
              Go to{" "}
              <Link href="/dashboard/resort/profile" className="font-semibold text-amber-950 underline underline-offset-2 hover:text-amber-800">
                Resort profile
              </Link>{" "}
              and complete <strong>Create my resort workspace</strong> (tenant + first resort). Then return here to add rooms.
            </p>
          </div>
        ) : null}
      </div>

      {error !== "no_resort_workspace" ? (
        <>
          <BulkActionBar
            count={bulk.selectedCount}
            onClear={bulk.clear}
            onDelete={() => setConfirmBulkDelete(true)}
            deleting={bulkDeleting}
            deleteLabel="Delete selected rooms"
          />
          <div className="md:hidden">
            {loading && rooms.length === 0 ? (
              <div className="rounded-2xl border border-softBorder bg-softCard p-8 text-center text-sm text-zinc-600">
                Loading rooms…
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-800">{error}</div>
            ) : totalRows === 0 ? (
              <div className="rounded-2xl border border-softBorder bg-softCard p-8 text-center text-sm text-zinc-600">
                No rooms found. Create your first room to begin accepting reservations.
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {rooms.map((room) => (
                    <DashMobileTableCard
                      key={room.id}
                      title={
                        <span className="inline-flex items-center gap-2">
                          <BulkSelectMobile
                            checked={bulk.isSelected(room.id)}
                            onChange={() => bulk.toggle(room.id)}
                            ariaLabel={`Select ${room.name}`}
                          />
                          <BedDouble size={16} className="shrink-0 text-skyBlue" />
                          {room.name}
                        </span>
                      }
                      fields={[
                        { label: "Code", value: room.code || "—" },
                        { label: "Capacity", value: String(room.capacity) },
                        { label: "Units", value: String(room.units ?? 1) },
                        { label: "Base price", value: formatPhp(Number(room.base_price)) },
                        {
                          label: "Status",
                          value: <span className={roomStatusClass[room.status] ?? "dash-badge-slate"}>{room.status}</span>,
                        },
                      ]}
                      actions={
                        <>
                          <Link href={`/dashboard/resort/rooms/${room.id}/edit`} className="dash-btn-sm w-full justify-center">
                            <Pencil size={14} />
                            Edit room
                          </Link>
                          <Link
                            href={`/dashboard/resort/rooms/${room.id}/calendar`}
                            className="dash-btn-sm w-full justify-center"
                          >
                            <CalendarDays size={14} />
                            Availability calendar
                          </Link>
                          <button
                            type="button"
                            className="dash-btn-danger w-full justify-center"
                            onClick={() => setConfirmDelete(room)}
                          >
                            <Trash2 size={14} />
                            Delete room
                          </button>
                        </>
                      }
                    />
                  ))}
                </div>
                {paginationFooter ? (
                  <div className="mt-3 overflow-hidden rounded-2xl border border-softBorder bg-softCard/95 shadow-table-wrap ring-1 ring-black/[0.04]">
                    {paginationFooter}
                  </div>
                ) : null}
              </>
            )}
          </div>

          <div className="hidden md:block">
            <DataTable
              minWidthClass="min-w-[820px]"
              scrollRegionLabel="Room inventory — swipe sideways to see all columns"
              footer={paginationFooter}
              leadingHeader={
                <BulkSelectTh
                  checked={bulk.isAllSelected}
                  indeterminate={bulk.isSomeSelected}
                  onChange={() => (bulk.isAllSelected ? bulk.clear() : bulk.selectAll())}
                  disabled={loading || rooms.length === 0}
                />
              }
              headers={
                <>
                  <SortableTh label="Name" sortKey="name" activeKey={sortBy} direction={sortDir} onSort={onSort} />
                  <SortableTh label="Code" sortKey="code" activeKey={sortBy} direction={sortDir} onSort={onSort} />
                  <SortableTh label="Capacity" sortKey="capacity" activeKey={sortBy} direction={sortDir} onSort={onSort} />
                  <SortableTh label="Units" sortKey="units" activeKey={sortBy} direction={sortDir} onSort={onSort} />
                  <SortableTh label="Base price" sortKey="base_price" activeKey={sortBy} direction={sortDir} onSort={onSort} />
                  <SortableTh label="Status" sortKey="status" activeKey={sortBy} direction={sortDir} onSort={onSort} />
                  <DashTableActionsHead srOnly>Row actions</DashTableActionsHead>
                </>
              }
            >
              <AsyncStatePanel
                loading={loading}
                error={error && error !== "no_resort_workspace" ? error : undefined}
                isEmpty={!loading && totalRows === 0}
                emptyText="No rooms found. Create your first room to begin accepting reservations."
                withinTable
                colSpan={8}
              >
                {rooms.map((room) => (
                  <tr key={room.id}>
                    <BulkSelectTd
                      checked={bulk.isSelected(room.id)}
                      onChange={() => bulk.toggle(room.id)}
                      ariaLabel={`Select ${room.name}`}
                    />
                    <td>
                      <p className="inline-flex items-center gap-2 font-medium text-navy">
                        <BedDouble size={14} className="text-skyBlue" />
                        {room.name}
                      </p>
                    </td>
                    <td className="text-zinc-600">{room.code || "—"}</td>
                    <td className="text-zinc-700">{room.capacity}</td>
                    <td className="text-zinc-700 tabular-nums">{room.units ?? 1}</td>
                    <td className="text-zinc-700">{formatPhp(Number(room.base_price))}</td>
                    <td>
                      <span className={roomStatusClass[room.status] ?? "dash-badge-slate"}>{room.status}</span>
                    </td>
                    <DashTableActionsCell>
                      <DashTableActionsInner className="dash-table-actions-inner--toolbar">
                        <Link
                          href={`/dashboard/resort/rooms/${room.id}/edit`}
                          className="dash-action-icon rounded-lg border border-softBorder bg-softCard/90 text-zinc-600 shadow-sm transition hover:bg-softCard hover:text-navy"
                          aria-label="Edit room"
                        >
                          <Pencil size={14} />
                        </Link>
                        <Link
                          href={`/dashboard/resort/rooms/${room.id}/calendar`}
                          className="dash-action-icon rounded-lg border border-softBorder bg-softCard/90 text-zinc-600 shadow-sm transition hover:bg-softCard hover:text-navy"
                          aria-label="Availability calendar"
                        >
                          <CalendarDays size={14} />
                        </Link>
                        <button
                          type="button"
                          className="dash-action-icon rounded-lg border border-rose-200 bg-rose-50 text-rose-700 transition hover:bg-rose-100"
                          onClick={() => setConfirmDelete(room)}
                          aria-label="Delete room"
                        >
                          <Trash2 size={14} />
                        </button>
                      </DashTableActionsInner>
                    </DashTableActionsCell>
                  </tr>
                ))}
              </AsyncStatePanel>
            </DataTable>
          </div>
        </>
      ) : null}

      <ConfirmDialog
        open={confirmBulkDelete}
        title="Delete selected rooms?"
        description={`Delete ${bulk.selectedCount} room${bulk.selectedCount === 1 ? "" : "s"} on this page. This cannot be undone.`}
        confirmLabel="Delete selected"
        tone="danger"
        loading={bulkDeleting}
        onCancel={() => setConfirmBulkDelete(false)}
        onConfirm={() => void onBulkDelete()}
      />
      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete room?"
        description={confirmDelete ? `Delete ${confirmDelete.name}. This cannot be undone.` : "Delete this room?"}
        confirmLabel="Delete"
        tone="danger"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) void onDelete(confirmDelete.id);
        }}
      />
      <RoomModal
        open={createOpen}
        title="Add"
        loading={createSaving}
        roomId={createRoomId ?? undefined}
        initialActiveTab={createModalTab}
        detailsSubmitLabel={createRoomId ? "Save changes" : "Save & continue to photos"}
        onClose={() => {
          if (createSaving) return;
          setCreateOpen(false);
          setCreateRoomId(null);
          setCreateModalTab("details");
        }}
        onSave={onCreateRoom}
        initialValues={{
          resort_id: resort?.id ?? 0,
          name: "",
          capacity: 1,
          units: 1,
          base_price: 0,
          bed_count: 1,
          bed_type: "Double",
          inclusions: [],
          custom_inclusions_enabled: false,
          custom_inclusions_text: "",
          amenities: [],
          rules: "",
          status: "active",
        }}
      />

    </div>
  );
}

