"use client";

import DashCard from "@/components/dash/DashCard";
import DashMobileTableCard, { DashMobileTableSkeleton } from "@/components/shared/DashMobileTableCard";
import {
  DashTableActionsCell,
  DashTableActionsHead,
  DashTableActionsInner,
} from "@/components/shared/DashTableActions";
import { apiClient } from "@/lib/api/client";
import { CalendarDays, ChevronLeft, MessageSquare, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";

type Reservation = {
  id: number;
  reference_no: string;
  status: string;
  check_in_date: string;
  check_out_date: string;
  guest_count: number;
  total_amount: number;
  reservation_fee: number;
};

type ApiEnvelope<T> = { success: boolean; data: { data: T[] } };

const statusBadge: Record<string, string> = {
  confirmed:       "dash-badge-emerald",
  pending_payment: "dash-badge-amber",
  cancelled:       "dash-badge-rose",
  expired:         "dash-badge-slate",
  no_show:         "dash-badge-rose",
  completed:       "dash-badge-navy",
};

export default function StaffReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");

  const load = async (q = "") => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get<ApiEnvelope<Reservation>>("/reservations", {
        params: { perPage: 50, search: q || undefined },
      });
      setReservations(data.data?.data ?? []);
    } catch (err: unknown) {
      setReservations([]);
      setError(parseApiErrorMessage(err, "Failed to load reservations."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(query);
    void load(query);
  };

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
        <div className="relative flex-1">
          <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            className="dash-input pl-9"
            placeholder="Search reference…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button type="submit" className="dash-btn-primary shrink-0">Search</button>
      </form>

      <DashCard className="overflow-hidden p-0">
        {loading ? (
          <>
            <div className="md:hidden p-4"><DashMobileTableSkeleton rows={5} /></div>
            <div className="hidden md:block space-y-2 p-4">{[1,2,3,4,5].map(i=><div key={i} className="h-12 animate-pulse rounded-xl bg-softGray"/>)}</div>
          </>
        ) : error ? (
          <div className="px-6 py-8 text-center">
            <p className="text-sm text-rose-700">{error}</p>
            <button type="button" className="dash-btn-sm mt-3" onClick={() => void load(search)}>
              Retry
            </button>
          </div>
        ) : reservations.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-zinc-500">No reservations found.</p>
        ) : (
          <>
            <div className="md:hidden space-y-3 p-4">
              {reservations.map((r) => (
                <DashMobileTableCard
                  key={r.id}
                  title={<span className="font-mono text-sm">{r.reference_no}</span>}
                  fields={[
                    { label: "Check-in", value: r.check_in_date },
                    { label: "Check-out", value: r.check_out_date },
                    { label: "Guests", value: r.guest_count },
                    { label: "Total", value: `₱${Number(r.total_amount).toLocaleString()}` },
                    {
                      label: "Status",
                      value: <span className={statusBadge[r.status] ?? "dash-badge-slate"}>{r.status.replaceAll("_", " ")}</span>,
                    },
                  ]}
                  actions={
                    <Link href={`/dashboard/staff/reservations/${r.id}`} className="dash-btn-sm w-full justify-center">
                      <MessageSquare size={13} /> Note
                    </Link>
                  }
                />
              ))}
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Check-in</th>
                    <th>Check-out</th>
                    <th>Guests</th>
                    <th>Total</th>
                    <th>Status</th>
                    <DashTableActionsHead>Action</DashTableActionsHead>
                  </tr>
                </thead>
                <tbody>
                  {reservations.map((r) => (
                    <tr key={r.id}>
                      <td className="font-mono text-xs font-semibold text-navy">{r.reference_no}</td>
                      <td className="text-zinc-600">{r.check_in_date}</td>
                      <td className="text-zinc-600">{r.check_out_date}</td>
                      <td className="text-zinc-600">{r.guest_count}</td>
                      <td className="font-medium text-emerald-700">₱{Number(r.total_amount).toLocaleString()}</td>
                      <td><span className={statusBadge[r.status] ?? "dash-badge-slate"}>{r.status.replaceAll("_"," ")}</span></td>
                      <DashTableActionsCell>
                        <DashTableActionsInner>
                          <Link href={`/dashboard/staff/reservations/${r.id}`} className="dash-btn-sm">
                            <MessageSquare size={13} /> Note
                          </Link>
                        </DashTableActionsInner>
                      </DashTableActionsCell>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </DashCard>
    </div>
  );
}
