"use client";

import AsyncStatePanel from "@/components/shared/AsyncStatePanel";
import DataTable from "@/components/shared/DataTable";
import {
  DashTableActionsCell,
  DashTableActionsHead,
  DashTableActionsInner,
} from "@/components/shared/DashTableActions";
import DashMobileTableCard, { DashMobileTableSkeleton } from "@/components/shared/DashMobileTableCard";
import { apiClient } from "@/lib/api/client";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";
import { BadgeCheck, CalendarDays, Clock, Search, XCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type Reservation = {
  id: number;
  referenceNo: string;
  status: string;
  checkInDate: string;
  checkOutDate: string;
  reservationFee: number;
  totalAmount: number;
  xenditPaymentStatus: string;
};

type PaginatedEnvelope = {
  success: boolean;
  data: {
    data: Reservation[];
    meta?: { current_page: number; last_page: number; total: number };
  };
};

const statusBadge: Record<string, string> = {
  confirmed:       "dash-badge-emerald",
  pending_payment: "dash-badge-amber",
  cancelled:       "dash-badge-rose",
  expired:         "dash-badge-slate",
  no_show:         "dash-badge-rose",
  completed:       "dash-badge-navy",
};

export default function BookingHistoryPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  const load = async (q: string, st: string, pg: number) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get<PaginatedEnvelope>("/reservations", {
        params: { search: q || undefined, status: st || undefined, perPage: 10, page: pg },
      });
      setReservations(data.data?.data ?? []);
      setLastPage(data.data?.meta?.last_page ?? 1);
    } catch (err) {
      setError(parseApiErrorMessage(err, "Failed to load bookings."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(search, statusFilter, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const onFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    void load(search, statusFilter, 1);
  };

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
              onChange={(e) => setSearch(e.target.value)}
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
      </div>

      <div className="hidden md:block">
        <DataTable
          headers={
            <>
              <th>Reference</th>
              <th>Dates</th>
              <th>Fee</th>
              <th>Status</th>
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
            colSpan={5}
          >
            {reservations.map((r) => (
              <tr key={r.id} className="group transition-colors duration-150 hover:bg-softGray/60">
                <td className="font-mono font-semibold text-navy">{r.referenceNo}</td>
                <td className="text-zinc-600">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays size={12} className="text-skyBlue/80" />
                    {r.checkInDate} → {r.checkOutDate}
                  </span>
                </td>
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


      {lastPage > 1 ? (
        <div className="flex items-center justify-center gap-3">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="dash-btn-sm disabled:opacity-40">
            ← Prev
          </button>
          <span className="text-sm text-zinc-600">
            Page {page} of {lastPage}
          </span>
          <button disabled={page >= lastPage} onClick={() => setPage((p) => p + 1)} className="dash-btn-sm disabled:opacity-40">
            Next →
          </button>
        </div>
      ) : null}
    </div>
  );
}

