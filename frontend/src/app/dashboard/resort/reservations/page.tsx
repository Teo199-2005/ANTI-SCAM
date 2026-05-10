"use client";

import { apiClient } from "@/lib/api/client";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";
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
import { ChevronDown, ChevronUp, Filter, ReceiptText } from "lucide-react";
import { Fragment, useEffect, useState } from "react";

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

const statusBadge: Record<string, string> = {
  confirmed: "dash-badge-emerald",
  pending_payment: "dash-badge-amber",
  cancelled: "dash-badge-rose",
  expired: "dash-badge-slate",
  no_show: "dash-badge-rose",
  completed: "dash-badge-navy",
};

export default function ResortReservationsPage() {
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
      const rawList = payload?.data ?? [];
      setRows(rawList.map((r) => normalizeReservation(r as Record<string, unknown>)));
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
        <p className="dash-page-sub">Track booking status, guest details, and payment states.</p>
      </div>

      <div className="dash-card dash-filter-bar items-stretch p-4 md:items-end">
        <div className="min-w-48 flex-1">
          <label className="mb-1.5 block text-xs font-semibold text-zinc-600">Status filter</label>
          <select className="dash-input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="pending_payment">pending_payment</option>
            <option value="confirmed">confirmed</option>
            <option value="cancelled">cancelled</option>
            <option value="expired">expired</option>
            <option value="no_show">no_show</option>
            <option value="completed">completed</option>
          </select>
        </div>
        <button type="button" className="dash-btn-primary" onClick={() => applyFilter()}>
          <Filter size={14} />
          Apply
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
                    { label: "Total", value: `₱${Number(item.totalAmount).toLocaleString()}` },
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
                        <div className="space-y-2 border-t border-softBorder pt-3 text-dash-sm text-zinc-700">
                          <p>
                            <span className="font-semibold text-zinc-500">Room</span> {item.room?.name ?? "—"}
                          </p>
                          <p>
                            <span className="font-semibold text-zinc-500">Guest</span> {item.client?.name ?? "—"}
                          </p>
                          <p>
                            <span className="font-semibold text-zinc-500">Email</span> {item.client?.email ?? "—"}
                          </p>
                          <p>
                            <span className="font-semibold text-zinc-500">Reservation fee</span>{" "}
                            <span className="text-emerald-700">₱{Number(item.reservationFee).toLocaleString()}</span>
                          </p>
                          <p>
                            <span className="font-semibold text-zinc-500">Payment</span>{" "}
                            {item.xenditPaymentStatus ?? "pending"}
                          </p>
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
              return (
                <Fragment key={item.id}>
                  <tr>
                    <td className="font-semibold text-navy">{item.referenceNo}</td>
                    <td className="text-zinc-600">{item.checkInDate}</td>
                    <td className="text-zinc-600">{item.checkOutDate}</td>
                    <td className="text-zinc-700">{item.guestCount}</td>
                    <td className="text-emerald-700">₱{Number(item.totalAmount).toLocaleString()}</td>
                    <td>
                      <span className={statusBadge[item.status] ?? "dash-badge-slate"}>{item.status}</span>
                    </td>
                    <DashTableActionsCell>
                      <DashTableActionsInner>
                        <button type="button" className="dash-btn-sm" onClick={() => setOpenId(expanded ? null : item.id)}>
                          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          Details
                        </button>
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
                            Guest: <span className="font-medium text-zinc-900">{item.client?.name ?? "—"}</span>
                          </p>
                          <p>
                            Email: <span className="font-medium text-zinc-900">{item.client?.email ?? "—"}</span>
                          </p>
                          <p>
                            Reservation fee:{" "}
                            <span className="font-medium text-emerald-700">₱{Number(item.reservationFee).toLocaleString()}</span>
                          </p>
                          <p>
                            Payment status:{" "}
                            <span className="font-medium text-zinc-900">{item.xenditPaymentStatus ?? "pending"}</span>
                          </p>
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
    </div>
  );
}
