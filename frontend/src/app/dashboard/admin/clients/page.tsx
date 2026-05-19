"use client";

import { apiClient } from "@/lib/api/client";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";
import { formatPhp } from "@/lib/formatPhp";
import { sanitizeSearchQuery } from "@/lib/inputRestrictions";
import DashboardFilterSearch from "@/components/dashboard/DashboardFilterSearch";
import DashCard from "@/components/dash/DashCard";
import TablePaginationBar from "@/components/shared/TablePaginationBar";
import { extractLaravelMeta, type LaravelTableMeta } from "@/lib/tableSortPagination";
import { UserRound } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type PlatformClient = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  created_at: string | null;
  reservation_count: number;
  last_booking_at: string | null;
  resorts_booked: number;
  total_fees_paid: number;
};

type PaginatedEnvelope = {
  success: boolean;
  data: { data: PlatformClient[]; meta?: LaravelTableMeta } | PlatformClient[];
};

export default function AdminClientsPage() {
  const [clients, setClients] = useState<PlatformClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<LaravelTableMeta | null>(null);
  const [hasBookings, setHasBookings] = useState<"" | "1" | "0">("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get<PaginatedEnvelope>("/admin/clients", {
        params: {
          search: search || undefined,
          page,
          per_page: 25,
          has_bookings: hasBookings || undefined,
        },
      });
      const payload = data.data;
      const rows = Array.isArray(payload) ? payload : (payload?.data ?? []);
      setClients(rows);
      setMeta(extractLaravelMeta(payload));
      setError(null);
    } catch (err) {
      setError(parseApiErrorMessage(err, "Failed to load clients."));
    } finally {
      setLoading(false);
    }
  }, [search, page, hasBookings]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="dash-page-title flex items-center gap-2">
          <UserRound size={24} className="text-skyBlue" /> Platform clients
        </h1>
        <p className="dash-page-sub">
          Universal booker accounts across all resorts (includes migrated guest users).
        </p>
      </div>

      <div className="dash-filter-bar flex-wrap gap-3">
        <form
          className="contents"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setSearch(query);
          }}
        >
          <DashboardFilterSearch
            value={query}
            onChange={(v) => setQuery(sanitizeSearchQuery(v))}
            placeholder="Search name, email, phone…"
            wide
          />
        </form>
        <select
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
          value={hasBookings}
          onChange={(e) => {
            setHasBookings(e.target.value as "" | "1" | "0");
            setPage(1);
          }}
        >
          <option value="">All clients</option>
          <option value="1">With bookings</option>
          <option value="0">No bookings yet</option>
        </select>
      </div>

      {error ? (
        <DashCard className="p-8 text-center">
          <p className="text-sm text-rose-700">{error}</p>
          <button type="button" className="dash-btn-secondary mt-3" onClick={() => void load()}>
            Retry
          </button>
        </DashCard>
      ) : loading ? (
        <DashCard className="p-8 text-center text-sm text-zinc-500">Loading clients…</DashCard>
      ) : (
        <DashCard className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Bookings</th>
                  <th>Resorts</th>
                  <th>Fees paid</th>
                  <th>Joined</th>
                  <th>Last booking</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id}>
                    <td className="font-semibold text-navy">{c.name}</td>
                    <td className="text-sm">{c.email}</td>
                    <td className="text-sm text-zinc-600">{c.phone ?? "—"}</td>
                    <td>{c.reservation_count}</td>
                    <td>{c.resorts_booked}</td>
                    <td className="font-medium text-emerald-700">{formatPhp(c.total_fees_paid)}</td>
                    <td className="text-xs text-zinc-600">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString("en-PH") : "—"}
                    </td>
                    <td className="text-xs text-zinc-600">
                      {c.last_booking_at ? new Date(c.last_booking_at).toLocaleDateString("en-PH") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {clients.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-zinc-500">No clients match your filters.</p>
          ) : null}
          <TablePaginationBar
            page={page}
            lastPage={meta?.last_page ?? 1}
            total={meta?.total ?? clients.length}
            perPage={meta?.per_page ?? 25}
            onPageChange={setPage}
            onPerPageChange={() => {}}
          />
        </DashCard>
      )}
    </div>
  );
}
