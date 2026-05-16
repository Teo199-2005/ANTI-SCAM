"use client";

import { apiClient } from "@/lib/api/client";
import type { ApiEnvelope } from "@/lib/api/types";
import { listResorts } from "@/lib/api/resort";
import type { ResortItem } from "@/lib/api/resort";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";
import DashModal from "@/components/dash/DashModal";
import AsyncStatePanel from "@/components/shared/AsyncStatePanel";
import DataTable from "@/components/shared/DataTable";
import DashMobileTableCard, { DashMobileTableSkeleton } from "@/components/shared/DashMobileTableCard";
import {
  DashTableActionsCell,
  DashTableActionsHead,
  DashTableActionsInner,
} from "@/components/shared/DashTableActions";
import SortableTh from "@/components/shared/SortableTh";
import TablePaginationBar from "@/components/shared/TablePaginationBar";
import { extractLaravelMeta, nextSort, type LaravelTableMeta, type SortDir } from "@/lib/tableSortPagination";
import { useToast } from "@/components/shared/ToastProvider";
import { CheckCircle2, ChevronDown, ChevronUp, Filter, Pencil, Plus, ReceiptText, UserX, XCircle } from "lucide-react";
import { Fragment, useCallback, useEffect, useState } from "react";
import { formatPhp } from "@/lib/formatPhp";

type RoomRow = { id: number; resort_id: number; name: string; status: string };

type ManualFormState = {
  roomId: number | "";
  checkIn: string;
  checkOut: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  guestCount: number;
  totalAmount: string;
  reservationFee: string;
};

type ReservationRow = {
  id: number;
  referenceNo: string;
  status: string;
  checkInDate: string;
  checkOutDate: string;
  guestCount: number;
  reservationFee: number;
  totalAmount: number;
  xenditPaymentStatus: string | null;
  bookingSource: string;
  guestName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  room?: { id: number; name: string };
  client?: { id: number; name: string; email: string };
};

type PaginatedEnvelope = {
  success: boolean;
  data: { data: Record<string, unknown>[]; meta?: LaravelTableMeta };
};

const SORT_FIRST: Record<string, SortDir> = {
  reference_no: "asc",
  check_in_date: "desc",
  check_out_date: "desc",
  status: "asc",
  created_at: "desc",
  guest_count: "desc",
  total_amount: "desc",
};

function num(raw: unknown): number {
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function canMarkResortLifecycle(status: string, checkInDate: string): boolean {
  if (status !== "confirmed") return false;
  const d = checkInDate.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  return d <= new Date().toISOString().slice(0, 10);
}

function normalizeReservation(raw: Record<string, unknown>): ReservationRow {
  const roomRaw = raw.room as Record<string, unknown> | undefined;
  const clientRaw = raw.client as Record<string, unknown> | undefined;
  return {
    id: Number(raw.id),
    referenceNo: String(raw.referenceNo ?? raw.reference_no ?? ""),
    status: String(raw.status ?? ""),
    checkInDate: String(raw.checkInDate ?? raw.check_in_date ?? ""),
    checkOutDate: String(raw.checkOutDate ?? raw.check_out_date ?? ""),
    guestCount: num(raw.guestCount ?? raw.guest_count),
    reservationFee: num(raw.reservationFee ?? raw.reservation_fee),
    totalAmount: num(raw.totalAmount ?? raw.total_amount),
    xenditPaymentStatus:
      raw.xenditPaymentStatus != null
        ? String(raw.xenditPaymentStatus)
        : raw.xendit_payment_status != null
          ? String(raw.xendit_payment_status)
          : null,
    bookingSource: String(raw.bookingSource ?? raw.booking_source ?? "online"),
    guestName:
      raw.guestName != null
        ? String(raw.guestName)
        : raw.guest_name != null
          ? String(raw.guest_name)
          : null,
    guestEmail:
      raw.guestEmail != null
        ? String(raw.guestEmail)
        : raw.guest_email != null
          ? String(raw.guest_email)
          : null,
    guestPhone:
      raw.guestPhone != null
        ? String(raw.guestPhone)
        : raw.guest_phone != null
          ? String(raw.guest_phone)
          : null,
    room:
      roomRaw && typeof roomRaw.id !== "undefined"
        ? { id: Number(roomRaw.id), name: String(roomRaw.name ?? "") }
        : undefined,
    client:
      clientRaw && typeof clientRaw.id !== "undefined"
        ? {
            id: Number(clientRaw.id),
            name: String(clientRaw.name ?? ""),
            email: String(clientRaw.email ?? ""),
          }
        : undefined,
  };
}

function guestDisplayName(row: ReservationRow): string {
  if (row.client?.name) return row.client.name;
  if (row.guestName) return row.guestName;
  return "—";
}

function guestDisplayEmail(row: ReservationRow): string {
  if (row.client?.email) return row.client.email;
  if (row.guestEmail) return row.guestEmail;
  return "—";
}

const statusBadge: Record<string, string> = {
  confirmed: "dash-badge-emerald",
  pending_payment: "dash-badge-amber",
  cancelled: "dash-badge-rose",
  expired: "dash-badge-slate",
  no_show: "dash-badge-rose",
  completed: "dash-badge-navy",
};

function emptyManualForm(): ManualFormState {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const todayIso = new Date().toISOString().slice(0, 10);
  const tomorrowIso = tomorrow.toISOString().slice(0, 10);
  return {
    roomId: "",
    checkIn: todayIso,
    checkOut: tomorrowIso,
    guestName: "",
    guestEmail: "",
    guestPhone: "",
    guestCount: 2,
    totalAmount: "",
    reservationFee: "",
  };
}

function canEditManual(row: ReservationRow): boolean {
  if (row.bookingSource !== "manual" || row.status !== "confirmed") return false;
  const out = row.checkOutDate.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(out) && out >= new Date().toISOString().slice(0, 10);
}

function canCancelManual(row: ReservationRow): boolean {
  return row.bookingSource === "manual" && (row.status === "confirmed" || row.status === "pending_payment");
}

export default function ResortReservationsPage() {
  const { pushToast } = useToast();
  const [lifecycleBusyId, setLifecycleBusyId] = useState<number | null>(null);
  const [status, setStatus] = useState("");
  const [appliedStatus, setAppliedStatus] = useState("");
  const [rows, setRows] = useState<ReservationRow[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<LaravelTableMeta | null>(null);
  const [perPage, setPerPage] = useState(15);
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [resort, setResort] = useState<ResortItem | null>(null);
  const [roomOpts, setRoomOpts] = useState<{ id: number; name: string }[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [editManualId, setEditManualId] = useState<number | null>(null);
  const [manualSaving, setManualSaving] = useState(false);
  const [manualForm, setManualForm] = useState<ManualFormState>(() => emptyManualForm());

  useEffect(() => {
    void (async () => {
      try {
        const r = await listResorts({ perPage: 5 });
        setResort(r.data[0] ?? null);
      } catch {
        setResort(null);
      }
    })();
  }, []);

  const loadRoomOpts = useCallback(async (resortId: number) => {
    setRoomsLoading(true);
    try {
      const { data } = await apiClient.get<ApiEnvelope<{ data?: RoomRow[] } | RoomRow[]>>("/rooms", {
        params: { resort_id: resortId, perPage: 100, sort_by: "name", sort_dir: "asc" },
      });
      const payload = data.data;
      const rows = Array.isArray(payload) ? payload : (payload?.data ?? []);
      setRoomOpts(
        rows
          .filter((room) => Number(room.resort_id) === resortId && room.status === "active")
          .map((room) => ({ id: room.id, name: room.name })),
      );
    } catch {
      setRoomOpts([]);
    } finally {
      setRoomsLoading(false);
    }
  }, []);

  const openManualCreate = async () => {
    if (!resort?.id) {
      pushToast({ title: "No resort", description: "Create a resort workspace first.", tone: "error" });
      return;
    }
    setEditManualId(null);
    setManualForm(emptyManualForm());
    await loadRoomOpts(resort.id);
    setManualOpen(true);
  };

  const openManualEdit = async (row: ReservationRow) => {
    if (!resort?.id) return;
    setEditManualId(row.id);
    setManualForm({
      roomId: row.room?.id ?? "",
      checkIn: row.checkInDate.slice(0, 10),
      checkOut: row.checkOutDate.slice(0, 10),
      guestName: row.guestName ?? "",
      guestEmail: row.guestEmail ?? "",
      guestPhone: row.guestPhone ?? "",
      guestCount: row.guestCount,
      totalAmount: String(row.totalAmount),
      reservationFee: String(row.reservationFee),
    });
    await loadRoomOpts(resort.id);
    setManualOpen(true);
  };

  const submitManual = async () => {
    if (!resort?.id) return;
    if (!manualForm.roomId) {
      pushToast({ title: "Room required", description: "Choose a room for this stay.", tone: "error" });
      return;
    }
    if (!manualForm.guestName.trim()) {
      pushToast({ title: "Guest name required", tone: "error" });
      return;
    }
    const total = Number(manualForm.totalAmount);
    if (!Number.isFinite(total) || total < 0) {
      pushToast({ title: "Invalid total", description: "Enter a valid total amount.", tone: "error" });
      return;
    }
    setManualSaving(true);
    try {
      if (editManualId == null) {
        const body: Record<string, unknown> = {
          resort_id: resort.id,
          room_id: manualForm.roomId,
          check_in_date: manualForm.checkIn,
          check_out_date: manualForm.checkOut,
          guest_name: manualForm.guestName.trim(),
          guest_email: manualForm.guestEmail.trim() || null,
          guest_phone: manualForm.guestPhone.trim() || null,
          guest_count: manualForm.guestCount,
          total_amount: total,
        };
        const feeNum = Number(manualForm.reservationFee);
        if (manualForm.reservationFee.trim() !== "" && Number.isFinite(feeNum)) {
          body.reservation_fee = feeNum;
        }
        await apiClient.post("/reservations/manual", body);
        pushToast({ title: "Reservation created", tone: "success" });
      } else {
        const body: Record<string, unknown> = {
          room_id: manualForm.roomId,
          check_in_date: manualForm.checkIn,
          check_out_date: manualForm.checkOut,
          guest_name: manualForm.guestName.trim(),
          guest_email: manualForm.guestEmail.trim() || null,
          guest_phone: manualForm.guestPhone.trim() || null,
          guest_count: manualForm.guestCount,
          total_amount: total,
        };
        const feeNum = Number(manualForm.reservationFee);
        if (manualForm.reservationFee.trim() !== "") {
          body.reservation_fee = Number.isFinite(feeNum) ? feeNum : null;
        }
        await apiClient.patch(`/reservations/${editManualId}/manual`, body);
        pushToast({ title: "Reservation updated", tone: "success" });
      }
      setManualOpen(false);
      await load(appliedStatus, page, perPage, sortBy, sortDir);
    } catch (err) {
      pushToast({
        title: editManualId == null ? "Could not create" : "Could not update",
        description: parseApiErrorMessage(err, "Check the form and try again."),
        tone: "error",
      });
    } finally {
      setManualSaving(false);
    }
  };

  const cancelManualReservation = async (id: number) => {
    if (!window.confirm("Cancel this manual reservation?")) return;
    setLifecycleBusyId(id);
    try {
      await apiClient.post(`/reservations/${id}/cancel-by-resort`, {});
      pushToast({ title: "Reservation cancelled", tone: "success" });
      await load(appliedStatus, page, perPage, sortBy, sortDir);
    } catch (err) {
      pushToast({
        title: "Cancel failed",
        description: parseApiErrorMessage(err, "Could not cancel reservation."),
        tone: "error",
      });
    } finally {
      setLifecycleBusyId(null);
    }
  };

  const load = async (st: string, pg: number, pp: number, sb: string, sd: SortDir) => {
    setLoading(true);
    try {
      const { data } = await apiClient.get<PaginatedEnvelope>("/reservations", {
        params: {
          status: st || undefined,
          perPage: pp,
          page: pg,
          sort_by: sb,
          sort_dir: sd,
        },
      });
      const payload = data.data;
      const rawList = (Array.isArray(payload) ? payload : (payload?.data ?? [])) as Record<string, unknown>[];
      setRows(rawList.map((r) => normalizeReservation(r)));
      setMeta(extractLaravelMeta(payload));
      setError(null);
    } catch (err) {
      setRows([]);
      setMeta(null);
      setError(parseApiErrorMessage(err, "Unable to load reservations."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load("", 1, perPage, sortBy, sortDir);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lastPage = meta?.last_page ?? 1;
  const total = meta?.total ?? rows.length;

  const applyFilter = () => {
    setAppliedStatus(status);
    setPage(1);
    void load(status, 1, perPage, sortBy, sortDir);
  };

  const onSort = (key: string) => {
    const n = nextSort(key, sortBy, sortDir, SORT_FIRST[key] ?? "asc");
    setSortBy(n.key);
    setSortDir(n.dir);
    setPage(1);
    void load(appliedStatus, 1, perPage, n.key, n.dir);
  };

  const onPageChange = (p: number) => {
    setPage(p);
    void load(appliedStatus, p, perPage, sortBy, sortDir);
  };

  const onPerPageChange = (pp: number) => {
    setPerPage(pp);
    setPage(1);
    void load(appliedStatus, 1, pp, sortBy, sortDir);
  };

  const postLifecycle = async (id: number, path: "complete" | "no-show", okTitle: string) => {
    setLifecycleBusyId(id);
    try {
      await apiClient.post(`/reservations/${id}/${path}`);
      pushToast({ title: okTitle, description: "Reservation list refreshed.", tone: "success" });
      await load(appliedStatus, page, perPage, sortBy, sortDir);
    } catch (err) {
      pushToast({
        title: "Update failed",
        description: parseApiErrorMessage(err, "Could not update reservation."),
        tone: "error",
      });
    } finally {
      setLifecycleBusyId(null);
    }
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="dash-page-title inline-flex items-center gap-2">
          <ReceiptText size={24} className="text-skyBlue" />
          Reservations
        </h1>
        <p className="dash-page-sub">
          Track booking status, guest details, and payment states. <strong>pending_payment</strong> includes guests who
          abandoned Xendit or whose room hold expired — they can retry from their account.
        </p>
      </div>

      <div className="dash-filter-bar">
        <select
          className="dash-filter-select min-w-[9.5rem]"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Status filter"
        >
          <option value="">All statuses</option>
          <option value="pending_payment">pending_payment</option>
          <option value="confirmed">confirmed</option>
          <option value="cancelled">cancelled</option>
          <option value="expired">expired</option>
          <option value="no_show">no_show</option>
          <option value="completed">completed</option>
        </select>
        <button type="button" className="dash-filter-submit inline-flex items-center gap-1" onClick={() => applyFilter()}>
          <Filter size={13} aria-hidden />
          Apply
        </button>
        <button
          type="button"
          className="dash-filter-clear ml-auto inline-flex items-center gap-1"
          onClick={() => void openManualCreate()}
        >
          <Plus size={13} aria-hidden />
          Manual reservation
        </button>
      </div>

      <div className="md:hidden">
        {loading ? (
          <DashMobileTableSkeleton rows={4} />
        ) : error ? (
          <div className="dash-alert-error">{error}</div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-softBorder bg-softCard p-8 text-center text-sm text-zinc-600">
            No reservations found for this filter.
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((item) => {
              const expanded = openId === item.id;
              const lifecycle = canMarkResortLifecycle(item.status, item.checkInDate);
              return (
                <DashMobileTableCard
                  key={item.id}
                  title={item.referenceNo}
                  fields={[
                    {
                      label: "Dates",
                      value: `${item.checkInDate} → ${item.checkOutDate}`,
                    },
                    { label: "Guests", value: item.guestCount },
                    { label: "Total", value: formatPhp(Number(item.totalAmount)) },
                    {
                      label: "Status",
                      value: <span className={statusBadge[item.status] ?? "dash-badge-slate"}>{item.status}</span>,
                    },
                  ]}
                  actions={
                    <>
                      <button
                        type="button"
                        className="dash-btn-sm flex w-full items-center justify-center gap-2"
                        onClick={() => setOpenId(expanded ? null : item.id)}
                      >
                        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        {expanded ? "Hide details" : "Show details"}
                      </button>
                      {expanded ? (
                        <div className="grid grid-cols-2 gap-2 border-t border-softBorder pt-3 text-dash-sm text-zinc-700">
                          <p className="min-w-0">
                            <span className="block text-[10px] font-bold uppercase tracking-wide text-zinc-400">Room</span>
                            {item.room?.name ?? "—"}
                          </p>
                          <p className="min-w-0">
                            <span className="block text-[10px] font-bold uppercase tracking-wide text-zinc-400">Guest</span>
                            {guestDisplayName(item)}
                          </p>
                          <p className="col-span-2 min-w-0 break-all">
                            <span className="block text-[10px] font-bold uppercase tracking-wide text-zinc-400">Email</span>
                            {guestDisplayEmail(item)}
                          </p>
                          <p className="min-w-0">
                            <span className="block text-[10px] font-bold uppercase tracking-wide text-zinc-400">Reservation fee</span>
                            <span className="text-emerald-700">{formatPhp(Number(item.reservationFee))}</span>
                          </p>
                          <p className="min-w-0">
                            <span className="block text-[10px] font-bold uppercase tracking-wide text-zinc-400">Payment</span>
                            {item.xenditPaymentStatus ?? "pending"}
                          </p>
                          {canEditManual(item) || canCancelManual(item) ? (
                            <div className="col-span-2 mt-1 flex flex-col gap-2">
                              {canEditManual(item) ? (
                                <button
                                  type="button"
                                  className="dash-btn-sm flex w-full items-center justify-center gap-1.5 border border-sky-200 bg-sky-50 text-navy"
                                  onClick={() => void openManualEdit(item)}
                                >
                                  <Pencil size={14} />
                                  Edit manual
                                </button>
                              ) : null}
                              {canCancelManual(item) ? (
                                <button
                                  type="button"
                                  disabled={lifecycleBusyId === item.id}
                                  className="dash-btn-sm flex w-full items-center justify-center gap-1.5 border border-rose-200 bg-rose-50 text-rose-900"
                                  onClick={() => void cancelManualReservation(item.id)}
                                >
                                  <XCircle size={14} />
                                  {lifecycleBusyId === item.id ? "Cancelling…" : "Cancel reservation"}
                                </button>
                              ) : null}
                            </div>
                          ) : null}
                          {lifecycle ? (
                            <div className="col-span-2 flex flex-col gap-2">
                              <button
                                type="button"
                                disabled={lifecycleBusyId === item.id}
                                className="dash-btn-sm flex w-full items-center justify-center gap-1.5 border border-emerald-200 bg-emerald-50 text-emerald-900"
                                onClick={() => void postLifecycle(item.id, "complete", "Marked completed")}
                              >
                                <CheckCircle2 size={14} />
                                {lifecycleBusyId === item.id ? "Updating…" : "Mark stay completed"}
                              </button>
                              <button
                                type="button"
                                disabled={lifecycleBusyId === item.id}
                                className="dash-btn-sm flex w-full items-center justify-center gap-1.5 border border-rose-200 bg-rose-50 text-rose-900"
                                onClick={() => void postLifecycle(item.id, "no-show", "Marked no-show")}
                              >
                                <UserX size={14} />
                                {lifecycleBusyId === item.id ? "Updating…" : "Mark guest no-show"}
                              </button>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </>
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
          splitBodyRows
          footer={paginationFooter}
          headers={
            <>
              <SortableTh label="Reference" sortKey="reference_no" activeKey={sortBy} direction={sortDir} onSort={onSort} />
              <SortableTh label="Check-in" sortKey="check_in_date" activeKey={sortBy} direction={sortDir} onSort={onSort} />
              <SortableTh label="Check-out" sortKey="check_out_date" activeKey={sortBy} direction={sortDir} onSort={onSort} />
              <SortableTh label="Guests" sortKey="guest_count" activeKey={sortBy} direction={sortDir} onSort={onSort} />
              <SortableTh label="Total" sortKey="total_amount" activeKey={sortBy} direction={sortDir} onSort={onSort} />
              <SortableTh label="Status" sortKey="status" activeKey={sortBy} direction={sortDir} onSort={onSort} />
              <DashTableActionsHead srOnly>Row actions</DashTableActionsHead>
            </>
          }
        >
          <AsyncStatePanel
            loading={loading}
            error={error}
            isEmpty={rows.length === 0}
            emptyText="No reservations found for this filter."
            withinTable
            colSpan={7}
          >
            {rows.map((item) => {
              const expanded = openId === item.id;
              const lifecycle = canMarkResortLifecycle(item.status, item.checkInDate);
              return (
                <Fragment key={item.id}>
                  <tr>
                    <td className="font-semibold text-navy">{item.referenceNo}</td>
                    <td className="text-zinc-600">{item.checkInDate}</td>
                    <td className="text-zinc-600">{item.checkOutDate}</td>
                    <td className="text-zinc-700">{item.guestCount}</td>
                    <td className="text-emerald-700">{formatPhp(Number(item.totalAmount))}</td>
                    <td>
                      <span className={statusBadge[item.status] ?? "dash-badge-slate"}>{item.status}</span>
                    </td>
                    <DashTableActionsCell>
                      <DashTableActionsInner>
                        <button type="button" className="dash-btn-sm" onClick={() => setOpenId(expanded ? null : item.id)}>
                          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          Details
                        </button>
                        {canEditManual(item) ? (
                          <button
                            type="button"
                            className="dash-btn-sm border border-sky-200 bg-sky-50 text-navy"
                            onClick={() => void openManualEdit(item)}
                          >
                            <Pencil size={14} />
                            Edit
                          </button>
                        ) : null}
                        {canCancelManual(item) ? (
                          <button
                            type="button"
                            className="dash-btn-sm border border-rose-200 bg-rose-50 text-rose-900"
                            disabled={lifecycleBusyId === item.id}
                            onClick={() => void cancelManualReservation(item.id)}
                          >
                            <XCircle size={14} />
                            Cancel
                          </button>
                        ) : null}
                        {lifecycle ? (
                          <>
                            <button
                              type="button"
                              className="dash-btn-sm border border-emerald-200 bg-emerald-50 text-emerald-900"
                              disabled={lifecycleBusyId === item.id}
                              onClick={() => void postLifecycle(item.id, "complete", "Marked completed")}
                            >
                              <CheckCircle2 size={14} />
                              Complete
                            </button>
                            <button
                              type="button"
                              className="dash-btn-sm border border-rose-200 bg-rose-50 text-rose-900"
                              disabled={lifecycleBusyId === item.id}
                              onClick={() => void postLifecycle(item.id, "no-show", "Marked no-show")}
                            >
                              <UserX size={14} />
                              No-show
                            </button>
                          </>
                        ) : null}
                      </DashTableActionsInner>
                    </DashTableActionsCell>
                  </tr>
                  <tr className={`overflow-hidden transition-all duration-300 ${expanded ? "opacity-100" : "opacity-0 h-0"}`}>
                    <td colSpan={7} className={`bg-softCard/40 ${expanded ? "p-0" : "py-0"}`}>
                      {expanded && (
                        <div className="dash-inset m-3 space-y-2">
                          <p>
                            Room: <span className="font-medium text-zinc-900">{item.room?.name ?? "—"}</span>
                          </p>
                          <p>
                            Guest: <span className="font-medium text-zinc-900">{guestDisplayName(item)}</span>
                          </p>
                          <p>
                            Email: <span className="font-medium text-zinc-900">{guestDisplayEmail(item)}</span>
                          </p>
                          <p>
                            Reservation fee:{" "}
                            <span className="font-medium text-emerald-700">{formatPhp(Number(item.reservationFee))}</span>
                          </p>
                          <p>
                            Payment status:{" "}
                            <span className="font-medium text-zinc-900">{item.xenditPaymentStatus ?? "pending"}</span>
                          </p>
                          {canEditManual(item) || canCancelManual(item) ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {canEditManual(item) ? (
                                <button
                                  type="button"
                                  className="dash-btn-sm border border-sky-200 bg-sky-50 text-navy"
                                  onClick={() => void openManualEdit(item)}
                                >
                                  <Pencil size={14} className="inline" /> Edit manual
                                </button>
                              ) : null}
                              {canCancelManual(item) ? (
                                <button
                                  type="button"
                                  className="dash-btn-sm border border-rose-200 bg-rose-50 text-rose-900"
                                  disabled={lifecycleBusyId === item.id}
                                  onClick={() => void cancelManualReservation(item.id)}
                                >
                                  <XCircle size={14} className="inline" />{" "}
                                  {lifecycleBusyId === item.id ? "Cancelling…" : "Cancel reservation"}
                                </button>
                              ) : null}
                            </div>
                          ) : null}
                          {lifecycle ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                className="dash-btn-sm border border-emerald-200 bg-emerald-50 text-emerald-900"
                                disabled={lifecycleBusyId === item.id}
                                onClick={() => void postLifecycle(item.id, "complete", "Marked completed")}
                              >
                                <CheckCircle2 size={14} className="inline" /> Mark stay completed
                              </button>
                              <button
                                type="button"
                                className="dash-btn-sm border border-rose-200 bg-rose-50 text-rose-900"
                                disabled={lifecycleBusyId === item.id}
                                onClick={() => void postLifecycle(item.id, "no-show", "Marked no-show")}
                              >
                                <UserX size={14} className="inline" /> Mark guest no-show
                              </button>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </td>
                  </tr>
                </Fragment>
              );
            })}
          </AsyncStatePanel>
        </DataTable>
      </div>

      <DashModal
        open={manualOpen}
        onClose={() => {
          if (!manualSaving) setManualOpen(false);
        }}
        title={editManualId == null ? "Add manual reservation" : "Edit manual reservation"}
        description="Desk or phone bookings — stored as confirmed with no Xendit invoice."
      >
        <div className="grid max-h-[min(70vh,32rem)] gap-3 overflow-y-auto pr-1 text-sm">
          {roomsLoading ? <p className="text-xs text-zinc-500">Loading rooms…</p> : null}
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-600">Room</label>
            <select
              className="dash-input w-full"
              value={manualForm.roomId === "" ? "" : String(manualForm.roomId)}
              onChange={(e) => {
                const v = e.target.value;
                setManualForm((f) => ({ ...f, roomId: v === "" ? "" : Number(v) }));
              }}
            >
              <option value="">{roomOpts.length ? "Select room" : "No active rooms"}</option>
              {roomOpts.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-600">Check-in</label>
              <input
                type="date"
                className="dash-input w-full"
                value={manualForm.checkIn}
                onChange={(e) => setManualForm((f) => ({ ...f, checkIn: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-600">Check-out</label>
              <input
                type="date"
                className="dash-input w-full"
                value={manualForm.checkOut}
                onChange={(e) => setManualForm((f) => ({ ...f, checkOut: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-600">Guest name</label>
            <input
              className="dash-input w-full"
              value={manualForm.guestName}
              onChange={(e) => setManualForm((f) => ({ ...f, guestName: e.target.value }))}
              placeholder="Guest or party name"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-600">Email (optional)</label>
              <input
                type="email"
                className="dash-input w-full"
                value={manualForm.guestEmail}
                onChange={(e) => setManualForm((f) => ({ ...f, guestEmail: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-600">Phone (optional)</label>
              <input
                className="dash-input w-full"
                value={manualForm.guestPhone}
                onChange={(e) => setManualForm((f) => ({ ...f, guestPhone: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-600">Guest count</label>
              <input
                type="number"
                min={1}
                className="dash-input w-full"
                value={manualForm.guestCount}
                onChange={(e) => setManualForm((f) => ({ ...f, guestCount: Math.max(1, Number(e.target.value) || 1) }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-600">Total (PHP)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                className="dash-input w-full"
                value={manualForm.totalAmount}
                onChange={(e) => setManualForm((f) => ({ ...f, totalAmount: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-600">Reservation fee (optional override)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              className="dash-input w-full"
              value={manualForm.reservationFee}
              onChange={(e) => setManualForm((f) => ({ ...f, reservationFee: e.target.value }))}
              placeholder="Leave blank for platform default"
            />
          </div>
          <div className="flex justify-end gap-2 border-t border-softBorder pt-3">
            <button type="button" className="dash-btn-sm border border-zinc-200 bg-white" disabled={manualSaving} onClick={() => setManualOpen(false)}>
              Close
            </button>
            <button type="button" className="dash-btn-primary" disabled={manualSaving} onClick={() => void submitManual()}>
              {manualSaving ? "Saving…" : editManualId == null ? "Create" : "Save changes"}
            </button>
          </div>
        </div>
      </DashModal>
    </div>
  );
}
