"use client";

import BookingPaymentReturnModal from "@/components/dashboard/BookingPaymentReturnModal";
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
import { apiClient } from "@/lib/api/client";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";
import { sanitizeSearchQuery } from "@/lib/inputRestrictions";
import { extractLaravelMeta, nextSort, type LaravelTableMeta, type SortDir } from "@/lib/tableSortPagination";
import { BadgeCheck, CalendarDays, Clock, Search, XCircle } from "lucide-react";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Reservation = {
  id: number;
  referenceNo: string;
  status: string;
  checkInDate: string;
  checkOutDate: string;
  reservationFee: number;
  totalAmount: number;
  xenditPaymentStatus: string;
  createdAt?: string;
};

type PaginatedEnvelope = {
  success: boolean;
  data: Reservation[] | { data: Reservation[]; meta?: LaravelTableMeta };
};

const SORT_FIRST: Record<string, SortDir> = {
  reference_no: "asc",
  check_in_date: "desc",
  check_out_date: "desc",
  status: "asc",
  created_at: "desc",
};

const statusBadge: Record<string, string> = {
  confirmed: "dash-badge-emerald",
  pending_payment: "dash-badge-amber",
  cancelled: "dash-badge-rose",
  expired: "dash-badge-slate",
  no_show: "dash-badge-rose",
  completed: "dash-badge-navy",
};

function ClientBookingsContent() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedStatus, setAppliedStatus] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<LaravelTableMeta | null>(null);
  const [perPage, setPerPage] = useState(10);
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const load = async (q: string, st: string, pg: number, pp: number, sb: string, sd: SortDir) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get<PaginatedEnvelope>("/reservations", {
        params: {
          search: q || undefined,
          status: st || undefined,
          perPage: pp,
          page: pg,
          sort_by: sb,
          sort_dir: sd,
        },
      });
      const payload = data.data;
      const rows = Array.isArray(payload) ? payload : (payload?.data ?? []);
      setReservations(rows);
      setMeta(extractLaravelMeta(payload));
    } catch (err) {
      setReservations([]);
      setMeta(null);
      setError(parseApiErrorMessage(err, "Failed to load bookings."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load("", "", 1, perPage, sortBy, sortDir);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lastPage = meta?.last_page ?? 1;
  const total = meta?.total ?? reservations.length;

  const onFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedSearch(search);
    setAppliedStatus(statusFilter);
    setPage(1);
    void load(search, statusFilter, 1, perPage, sortBy, sortDir);
  };

  const onSort = (key: string) => {
    const n = nextSort(key, sortBy, sortDir, SORT_FIRST[key] ?? "asc");
    setSortBy(n.key);
    setSortDir(n.dir);
    setPage(1);
    void load(appliedSearch, appliedStatus, 1, perPage, n.key, n.dir);
  };

  const onPageChange = (p: number) => {
    setPage(p);
    void load(appliedSearch, appliedStatus, p, perPage, sortBy, sortDir);
  };

  const onPerPageChange = (pp: number) => {
    setPerPage(pp);
    setPage(1);
    void load(appliedSearch, appliedStatus, 1, pp, sortBy, sortDir);
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
      <div className="dash-card p-6">
        <h1 className="dash-page-title">Booking history</h1>
        <p className="dash-page-sub">All your resort reservations in one place.</p>

        <form onSubmit={onFilter} className="dash-filter-bar mt-5">
          <div className="relative min-w-[180px] flex-1">
            <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input
              className="dash-input pl-9"
              placeholder="Search by reference…"
              value={search}
              onChange={(e) => setSearch(sanitizeSearchQuery(e.target.value))}
            />
          </div>
          <select
            className="dash-input min-w-[160px] flex-shrink-0"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending_payment">Pending payment</option>
            <option value="cancelled">Cancelled</option>
            <option value="expired">Expired</option>
            <option value="completed">Completed</option>
            <option value="no_show">No show</option>
          </select>
          <button type="submit" className="dash-btn-primary">
            Filter
          </button>
        </form>
      </div>

      <div className="md:hidden">
        {loading ? (
          <DashMobileTableSkeleton rows={4} />
        ) : error ? (
          <div className="dash-alert-error">{error}</div>
        ) : reservations.length === 0 ? (
          <div className="rounded-2xl border border-softBorder bg-softCard p-8 text-center text-sm text-zinc-600">
            <span>
              No bookings yet.{" "}
              <Link href="/resorts" className="font-medium text-skyBlue hover:underline">
                Browse resorts →
              </Link>
            </span>
          </div>
        ) : (
          <div className="space-y-3">
            {reservations.map((r) => (
              <DashMobileTableCard
                key={r.id}
                title={<span className="font-mono text-sm">{r.referenceNo}</span>}
                fields={[
                  {
                    label: "Stay",
                    value: (
                      <span className="inline-flex flex-wrap items-center gap-1">
                        <CalendarDays size={12} className="shrink-0 text-skyBlue/80" />
                        <span>
                          {r.checkInDate} → {r.checkOutDate}
                        </span>
                      </span>
                    ),
                  },
                  { label: "Fee", value: `₱${Number(r.reservationFee).toLocaleString()}` },
                  {
                    label: "Status",
                    value: (
                      <span className={statusBadge[r.status] ?? "dash-badge-slate"}>
                        {r.status === "confirmed" ? (
                          <BadgeCheck size={11} />
                        ) : r.status === "pending_payment" ? (
                          <Clock size={11} />
                        ) : (
                          <XCircle size={11} />
                        )}
                        {r.status.replaceAll("_", " ")}
                      </span>
                    ),
                  },
                ]}
                actions={
                  <Link href={`/dashboard/client/bookings/${r.id}`} className="dash-btn-sm w-full justify-center">
                    View booking
                  </Link>
                }
              />
            ))}
          </div>
        )}
        {paginationFooter ? <div className="dash-table-wrap overflow-hidden rounded-2xl">{paginationFooter}</div> : null}
      </div>

      <div className="hidden md:block">
        <DataTable
          footer={paginationFooter}
          headers={
            <>
              <SortableTh label="Reference" sortKey="reference_no" activeKey={sortBy} direction={sortDir} onSort={onSort} />
              <SortableTh label="Check-in" sortKey="check_in_date" activeKey={sortBy} direction={sortDir} onSort={onSort} />
              <SortableTh label="Check-out" sortKey="check_out_date" activeKey={sortBy} direction={sortDir} onSort={onSort} />
              <th>Fee</th>
              <SortableTh label="Status" sortKey="status" activeKey={sortBy} direction={sortDir} onSort={onSort} />
              <SortableTh label="Booked" sortKey="created_at" activeKey={sortBy} direction={sortDir} onSort={onSort} />
              <DashTableActionsHead srOnly>Booking actions</DashTableActionsHead>
            </>
          }
        >
          <AsyncStatePanel
            loading={loading}
            error={error}
            isEmpty={reservations.length === 0}
            emptyNode={
              <span>
                No bookings yet.{" "}
                <Link href="/resorts" className="font-medium text-skyBlue hover:underline">
                  Browse resorts →
                </Link>
              </span>
            }
            withinTable
            colSpan={7}
          >
            {reservations.map((r) => (
              <tr key={r.id} className="group transition-colors duration-150 hover:bg-softGray/60">
                <td className="font-mono font-semibold text-navy">{r.referenceNo}</td>
                <td className="text-zinc-600">{r.checkInDate}</td>
                <td className="text-zinc-600">{r.checkOutDate}</td>
                <td className="text-zinc-700">₱{Number(r.reservationFee).toLocaleString()}</td>
                <td>
                  <span className={statusBadge[r.status] ?? "dash-badge-slate"}>
                    {r.status === "confirmed" ? (
                      <BadgeCheck size={11} />
                    ) : r.status === "pending_payment" ? (
                      <Clock size={11} />
                    ) : (
                      <XCircle size={11} />
                    )}
                    {r.status.replaceAll("_", " ")}
                  </span>
                </td>
                <td className="text-xs text-zinc-500">
                  {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}
                </td>
                <DashTableActionsCell>
                  <DashTableActionsInner>
                    <Link href={`/dashboard/client/bookings/${r.id}`} className="dash-btn-sm">
                      View
                    </Link>
                  </DashTableActionsInner>
                </DashTableActionsCell>
              </tr>
            ))}
          </AsyncStatePanel>
        </DataTable>
      </div>
    </div>
  );
}

function ClientBookingsWithPaymentReturn() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [contentKey, setContentKey] = useState(0);
  const from = searchParams.get("from");
  const fromPayment = from === "payment";
  const fromPaymentFailed = from === "payment_failed";
  const paymentReturnId = searchParams.get("reservation_id");
  const paymentReturnRef = searchParams.get("ref");
  const paymentModalOpen = Boolean(paymentReturnId && (fromPayment || fromPaymentFailed));
  const paymentModalFlow = fromPaymentFailed ? "failed" : "success";

  const stripPaymentReturnQuery = useCallback(() => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.delete("from");
    sp.delete("reservation_id");
    sp.delete("ref");
    const next = sp.toString();
    router.replace(next ? `${pathname}?${next}` : pathname);
    setContentKey((k) => k + 1);
  }, [pathname, router, searchParams]);

  return (
    <>
      {paymentReturnId ? (
        <BookingPaymentReturnModal
          open={paymentModalOpen}
          onClose={stripPaymentReturnQuery}
          flow={paymentModalFlow}
          reservationId={paymentReturnId}
          refFallback={paymentReturnRef}
        />
      ) : null}
      <ClientBookingsContent key={contentKey} />
    </>
  );
}

export default function BookingHistoryPage() {
  return (
    <Suspense fallback={<div className="space-y-6 p-6 text-sm text-zinc-500">Loading…</div>}>
      <ClientBookingsWithPaymentReturn />
    </Suspense>
  );
}
