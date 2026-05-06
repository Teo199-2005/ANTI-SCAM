"use client";

import AsyncStatePanel from "@/components/shared/AsyncStatePanel";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import DataTable from "@/components/shared/DataTable";
import DashMobileTableCard, { DashMobileTableSkeleton } from "@/components/shared/DashMobileTableCard";
import {
  DashTableActionsCell,
  DashTableActionsHead,
  DashTableActionsInner,
} from "@/components/shared/DashTableActions";
import { useToast } from "@/components/shared/ToastProvider";
import { apiClient } from "@/lib/api/client";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";
import { BadgeCheck, CalendarDays, Clock, Search, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

type Reservation = {
  id: number;
  referenceNo: string;
  status: string;
  checkInDate: string;
  checkOutDate: string;
  reservationFee: number;
  xenditPaymentStatus: string;
};

type PaginatedEnvelope = {
  success: boolean;
  data: { data: Reservation[]; meta?: { current_page: number; last_page: number; total: number } };
};

const statusBadge: Record<string, string> = {
  confirmed:       "dash-badge-emerald",
  pending_payment: "dash-badge-amber",
  cancelled:       "dash-badge-rose",
  expired:         "dash-badge-slate",
  no_show:         "dash-badge-rose",
  completed:       "dash-badge-navy",
};

export default function AdminReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedStatus, setAppliedStatus] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [confirmOverride, setConfirmOverride] = useState<{ id: number; status: string } | null>(null);
  const [overridingId, setOverridingId] = useState<number | null>(null);
  const { pushToast } = useToast();

  const load = async (q: string, st: string, pg: number) => {
    setLoading(true);
    try {
      const { data } = await apiClient.get<PaginatedEnvelope>("/reservations", {
        params: { search: q || undefined, status: st || undefined, perPage: 15, page: pg },
      });
      setReservations(data.data?.data ?? []);
      setLastPage(data.data?.meta?.last_page ?? 1);
      setError(null);
    } catch (err) {
      setReservations([]);
      setError("Failed to load reservations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load("", "", 1);
  }, []);

  const onFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedSearch(search);
    setAppliedStatus(statusFilter);
    setPage(1);
    void load(search, statusFilter, 1);
  };

  const overrideStatus = async (id: number, status: string) => {
    setOverridingId(id);
    try {
      await apiClient.post(`/reservations/${id}/admin-override`, { status, reason: "Admin manual override" });
      setReservations((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
      pushToast({ title: "Reservation updated", tone: "success" });
    } catch (err) {
      pushToast({ title: "Override failed", description: "Unable to update reservation status.", tone: "error" });
    } finally {
      setOverridingId(null);
      setConfirmOverride(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="dash-page-title flex items-center gap-2">
          <CalendarDays size={24} className="text-skyBlue" />
          All reservations
        </h1>
        <p className="dash-page-sub">View and manage every reservation across all resorts.</p>

        <form onSubmit={onFilter} className="dash-filter-bar mt-5">
          <div className="relative min-w-[200px] flex-1">
            <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input
              className="dash-input pl-9"
              placeholder="Search reference…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="dash-input min-w-[160px]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending_payment">Pending payment</option>
            <option value="cancelled">Cancelled</option>
            <option value="expired">Expired</option>
          </select>
          <button type="submit" className="dash-btn-primary shrink-0">
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
          <div className="rounded-2xl border border-softBorder bg-softCard p-8 text-center text-sm text-zinc-600">No reservations found.</div>
        ) : (
          <div className="space-y-3">
            {reservations.map((r) => (
              <DashMobileTableCard
                key={r.id}
                title={<span className="font-mono text-sm">{r.referenceNo}</span>}
                fields={[
                  {
                    label: "Dates",
                    value: (
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays size={12} className="text-zinc-600" />
                        {r.checkInDate} → {r.checkOutDate}
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
                  {
                    label: "Payment (Xendit)",
                    value: r.xenditPaymentStatus || "—",
                  },
                ]}
                actions={
                  <div className="space-y-1">
                    <label className="font-dash text-[10px] font-bold uppercase tracking-widest text-zinc-400">Override status</label>
                    <select
                      className="dash-input w-full py-2.5 text-sm"
                      value={r.status}
                      disabled={overridingId === r.id}
                      onChange={(e) => setConfirmOverride({ id: r.id, status: e.target.value })}
                    >
                      <option value="pending_payment">pending_payment</option>
                      <option value="confirmed">confirmed</option>
                      <option value="cancelled">cancelled</option>
                      <option value="expired">expired</option>
                    </select>
                  </div>
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
              <DashTableActionsHead>Override</DashTableActionsHead>
            </>
          }
        >
          <AsyncStatePanel loading={loading} error={error} isEmpty={reservations.length === 0} emptyText="No reservations found." withinTable colSpan={5}>
            {reservations.map((r) => (
              <tr key={r.id}>
                <td className="font-mono font-semibold text-navy">{r.referenceNo}</td>
                <td className="text-zinc-600">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays size={12} className="text-zinc-600" />
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
                    <select
                      className="dash-input max-w-[170px] py-1.5 text-xs md:max-w-[170px]"
                      value={r.status}
                      disabled={overridingId === r.id}
                      onChange={(e) => setConfirmOverride({ id: r.id, status: e.target.value })}
                    >
                      <option value="pending_payment">pending_payment</option>
                      <option value="confirmed">confirmed</option>
                      <option value="cancelled">cancelled</option>
                      <option value="expired">expired</option>
                    </select>
                  </DashTableActionsInner>
                </DashTableActionsCell>
              </tr>
            ))}
          </AsyncStatePanel>
        </DataTable>
      </div>

      {lastPage > 1 ? (
        <div className="flex items-center justify-center gap-3">
          <button
            disabled={page <= 1}
            onClick={() => { const next = page - 1; setPage(next); void load(appliedSearch, appliedStatus, next); }}
            className="dash-btn-sm disabled:opacity-40"
          >
            ← Prev
          </button>
          <span className="text-sm text-zinc-600">
            Page {page} of {lastPage}
          </span>
          <button
            disabled={page >= lastPage}
            onClick={() => { const next = page + 1; setPage(next); void load(appliedSearch, appliedStatus, next); }}
            className="dash-btn-sm disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(confirmOverride)}
        title="Apply status override?"
        description={
          confirmOverride
            ? `Change reservation status to "${confirmOverride.status}"?`
            : "Confirm status override."
        }
        confirmLabel="Apply"
        loading={overridingId !== null}
        onCancel={() => setConfirmOverride(null)}
        onConfirm={() => {
          if (confirmOverride) void overrideStatus(confirmOverride.id, confirmOverride.status);
        }}
      />
    </div>
  );
}

