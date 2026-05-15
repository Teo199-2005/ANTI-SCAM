"use client";

import DashCard from "@/components/dash/DashCard";
import DataTable from "@/components/shared/DataTable";
import DashMobileTableCard, { DashMobileTableSkeleton } from "@/components/shared/DashMobileTableCard";
import {
  DashTableActionsCell,
  DashTableActionsHead,
  DashTableActionsInner,
} from "@/components/shared/DashTableActions";
import SortableTh from "@/components/shared/SortableTh";
import TablePaginationBar from "@/components/shared/TablePaginationBar";
import { apiClient } from "@/lib/api/client";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";
import { sanitizeSearchQuery } from "@/lib/inputRestrictions";
import { extractLaravelMeta, nextSort, type LaravelTableMeta, type SortDir } from "@/lib/tableSortPagination";
import DashboardFilterSearch from "@/components/dashboard/DashboardFilterSearch";
import { CalendarDays, ChevronLeft, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type Reservation = {
  id: number;
  referenceNo: string;
  status: string;
  checkInDate: string;
  checkOutDate: string;
  guestCount: number;
  totalAmount: number;
  reservationFee: number;
};

type PaginatedEnvelope = {
  success: boolean;
  data: { data: Record<string, unknown>[]; meta?: LaravelTableMeta };
};

const SORT_FIRST: Record<string, SortDir> = {
  reference_no: "asc",
  check_in_date: "desc",
  check_out_date: "desc",
  guest_count: "desc",
  total_amount: "desc",
  status: "asc",
  created_at: "desc",
};

function num(raw: unknown): number {
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function normalizeReservation(raw: Record<string, unknown>): Reservation {
  return {
    id: Number(raw.id),
    referenceNo: String(raw.referenceNo ?? raw.reference_no ?? ""),
    status: String(raw.status ?? ""),
    checkInDate: String(raw.checkInDate ?? raw.check_in_date ?? ""),
    checkOutDate: String(raw.checkOutDate ?? raw.check_out_date ?? ""),
    guestCount: num(raw.guestCount ?? raw.guest_count),
    totalAmount: num(raw.totalAmount ?? raw.total_amount),
    reservationFee: num(raw.reservationFee ?? raw.reservation_fee),
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

export default function StaffReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<LaravelTableMeta | null>(null);
  const [perPage, setPerPage] = useState(15);
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const load = async (q: string, pg: number, pp: number, sb: string, sd: SortDir) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get<PaginatedEnvelope>("/reservations", {
        params: {
          search: q || undefined,
          perPage: pp,
          page: pg,
          sort_by: sb,
          sort_dir: sd,
        },
      });
      const payload = data.data;
      const rawList = (Array.isArray(payload) ? payload : (payload?.data ?? [])) as Record<string, unknown>[];
      setReservations(rawList.map((r) => normalizeReservation(r)));
      setMeta(extractLaravelMeta(payload));
    } catch (err: unknown) {
      setReservations([]);
      setMeta(null);
      setError(parseApiErrorMessage(err, "Failed to load reservations."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load("", 1, perPage, sortBy, sortDir);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lastPage = meta?.last_page ?? 1;
  const total = meta?.total ?? reservations.length;

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedSearch(query);
    setPage(1);
    void load(query, 1, perPage, sortBy, sortDir);
  };

  const onSort = (key: string) => {
    const n = nextSort(key, sortBy, sortDir, SORT_FIRST[key] ?? "asc");
    setSortBy(n.key);
    setSortDir(n.dir);
    setPage(1);
    void load(appliedSearch, 1, perPage, n.key, n.dir);
  };

  const onPageChange = (p: number) => {
    setPage(p);
    void load(appliedSearch, p, perPage, sortBy, sortDir);
  };

  const onPerPageChange = (pp: number) => {
    setPerPage(pp);
    setPage(1);
    void load(appliedSearch, 1, pp, sortBy, sortDir);
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
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/dashboard/staff" className="dash-btn-sm">
          <ChevronLeft size={14} /> Back
        </Link>
        <div>
          <h1 className="dash-page-title flex items-center gap-2">
            <CalendarDays size={22} className="text-skyBlue" /> All Reservations
          </h1>
          <p className="dash-page-sub">View-only access. Click any row to add a support note.</p>
        </div>
      </div>

      <form onSubmit={onSearch} className="dash-filter-bar">
        <DashboardFilterSearch
          value={query}
          onChange={(v) => setQuery(sanitizeSearchQuery(v))}
          placeholder="Search reference…"
        />
      </form>

      <DashCard className="overflow-hidden p-0">
        {loading ? (
          <>
            <div className="p-4 md:hidden">
              <DashMobileTableSkeleton rows={5} />
            </div>
            <div className="hidden space-y-2 p-4 md:block">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-xl bg-softGray" />
              ))}
            </div>
          </>
        ) : error ? (
          <div className="px-6 py-8 text-center">
            <p className="text-sm text-rose-700">{error}</p>
            <button type="button" className="dash-btn-sm mt-3" onClick={() => void load(appliedSearch, page, perPage, sortBy, sortDir)}>
              Retry
            </button>
          </div>
        ) : reservations.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-zinc-500">No reservations found.</p>
        ) : (
          <>
            <div className="space-y-3 p-4 md:hidden">
              {reservations.map((r) => (
                <DashMobileTableCard
                  key={r.id}
                  title={<span className="font-mono text-sm">{r.referenceNo}</span>}
                  fields={[
                    { label: "Check-in", value: r.checkInDate },
                    { label: "Check-out", value: r.checkOutDate },
                    { label: "Guests", value: r.guestCount },
                    { label: "Total", value: `₱${Number(r.totalAmount).toLocaleString()}` },
                    {
                      label: "Status",
                      value: (
                        <span className={statusBadge[r.status] ?? "dash-badge-slate"}>{r.status.replaceAll("_", " ")}</span>
                      ),
                    },
                  ]}
                  actions={
                    <Link href={`/dashboard/staff/reservations/${r.id}`} className="dash-btn-sm w-full justify-center">
                      <MessageSquare size={13} /> Note
                    </Link>
                  }
                />
              ))}
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
                    <SortableTh label="Guests" sortKey="guest_count" activeKey={sortBy} direction={sortDir} onSort={onSort} />
                    <SortableTh label="Total" sortKey="total_amount" activeKey={sortBy} direction={sortDir} onSort={onSort} />
                    <SortableTh label="Status" sortKey="status" activeKey={sortBy} direction={sortDir} onSort={onSort} />
                    <DashTableActionsHead>Action</DashTableActionsHead>
                  </>
                }
              >
                <>
                  {reservations.map((r) => (
                    <tr key={r.id}>
                      <td className="font-mono text-xs font-semibold text-navy">{r.referenceNo}</td>
                      <td className="text-zinc-600">{r.checkInDate}</td>
                      <td className="text-zinc-600">{r.checkOutDate}</td>
                      <td className="text-zinc-600">{r.guestCount}</td>
                      <td className="font-medium text-emerald-700">₱{Number(r.totalAmount).toLocaleString()}</td>
                      <td>
                        <span className={statusBadge[r.status] ?? "dash-badge-slate"}>{r.status.replaceAll("_", " ")}</span>
                      </td>
                      <DashTableActionsCell>
                        <DashTableActionsInner>
                          <Link href={`/dashboard/staff/reservations/${r.id}`} className="dash-btn-sm">
                            <MessageSquare size={13} /> Note
                          </Link>
                        </DashTableActionsInner>
                      </DashTableActionsCell>
                    </tr>
                  ))}
                </>
              </DataTable>
            </div>
          </>
        )}
      </DashCard>
    </div>
  );
}
