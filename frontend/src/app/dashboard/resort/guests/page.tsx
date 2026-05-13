"use client";

import DashCard from "@/components/dash/DashCard";
import DashMobileTableCard, { DashMobileTableSkeleton } from "@/components/shared/DashMobileTableCard";
import Button from "@/components/ui/Button";
import { apiClient } from "@/lib/api/client";
import { sanitizeSearchQuery } from "@/lib/inputRestrictions";
import { Download, History, Mail, Search, Users, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type Guest = {
  id: number;
  guestKey: string;
  name: string;
  email: string | null;
  phone: string | null;
  reservationCount: number;
  lastCheckIn: string | null;
  lastCheckOut: string | null;
  totalSpent: number;
  firstBooking: string | null;
};

type ReservationRow = {
  id: number;
  referenceNo: string;
  status: string;
  checkInDate: string;
  checkOutDate: string;
  reservationFee: number;
  totalAmount: number;
  xenditPaymentStatus: string | null;
  room?: { id: number; name: string };
};

function extractGuestRows(payload: unknown): Guest[] {
  if (Array.isArray(payload)) return payload as Guest[];
  if (payload && typeof payload === "object" && Array.isArray((payload as { data: Guest[] }).data)) {
    return (payload as { data: Guest[] }).data;
  }
  return [];
}

function extractReservationRows(payload: unknown): ReservationRow[] {
  if (Array.isArray(payload)) return payload as ReservationRow[];
  if (payload && typeof payload === "object" && Array.isArray((payload as { data: ReservationRow[] }).data)) {
    return (payload as { data: ReservationRow[] }).data;
  }
  return [];
}

export default function ResortGuestsPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyName, setHistoryName] = useState("");
  const [historyRows, setHistoryRows] = useState<ReservationRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const load = useCallback(async (q = "") => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get<{ success: boolean; data: unknown }>("/resort/guests", {
        params: { search: q || undefined, perPage: 100 },
      });
      setGuests(extractGuestRows(data.data));
    } catch {
      setError("Failed to load guest list.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(query);
    void load(query);
  };

  const openHistory = async (g: Guest) => {
    setHistoryName(g.name);
    setHistoryOpen(true);
    setHistoryLoading(true);
    setHistoryError(null);
    setHistoryRows([]);
    try {
      const { data } = await apiClient.get<{ success: boolean; data: unknown }>(
        `/resort/guests/${encodeURIComponent(g.guestKey)}/reservations`,
        { params: { perPage: 100 } },
      );
      setHistoryRows(extractReservationRows(data.data));
    } catch {
      setHistoryError("Could not load reservation history.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const filtered = guests.filter((g) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      g.name.toLowerCase().includes(s) ||
      g.email?.toLowerCase().includes(s) ||
      g.phone?.includes(s)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="dash-page-title flex items-center gap-2">
          <Users size={24} className="text-skyBlue" /> Guest Directory
        </h1>
        <p className="dash-page-sub">All guests derived from your reservations and booking history.</p>
      </div>

      <div className="dash-filter-bar items-stretch md:flex-row md:flex-wrap md:items-center">
        <form onSubmit={onSearch} className="dash-filter-bar flex-1 md:min-w-[220px]">
          <div className="relative flex-1">
            <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              className="dash-input pl-9"
              placeholder="Search by name, email, or phone…"
              value={query}
              onChange={(e) => setQuery(sanitizeSearchQuery(e.target.value))}
            />
          </div>
          <button type="submit" className="dash-btn-primary shrink-0">Search</button>
        </form>
        {!loading && (
          <span className="rounded-full bg-navy/8 px-3 py-1 text-sm font-medium text-navy">
            {filtered.length} guest{filtered.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-800">{error}</div>
      ) : (
        <DashCard className="overflow-hidden p-0">
          {loading ? (
            <>
              <div className="md:hidden p-4"><DashMobileTableSkeleton rows={5} /></div>
              <div className="hidden md:block space-y-2 p-4">
                {[1,2,3,4,5].map((i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-softGray" />)}
              </div>
            </>
          ) : filtered.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <Users size={32} className="mx-auto text-zinc-300 mb-3" />
              <p className="text-zinc-500">No guests found.</p>
              {search ? <p className="text-xs text-zinc-400 mt-1">Try clearing the search filter.</p> : null}
            </div>
          ) : (
            <>
              <div className="md:hidden space-y-3 p-4">
                {filtered.map((g) => (
                  <DashMobileTableCard
                    key={g.guestKey}
                    title={g.name}
                    fields={[
                      {
                        label: "Email",
                        value: g.email ? (
                          <a href={`mailto:${g.email}`} className="inline-flex items-center gap-1 text-slateBlue hover:underline text-xs break-all">
                            <Mail size={11} /> {g.email}
                          </a>
                        ) : (
                          "—"
                        ),
                      },
                      { label: "Phone", value: g.phone ?? "—" },
                      {
                        label: "Bookings",
                        value: (
                          <span className="inline-flex items-center gap-1 rounded-full bg-navy/8 px-2 py-0.5 text-xs font-bold text-navy">
                            {g.reservationCount}
                          </span>
                        ),
                      },
                      { label: "Total spent", value: `₱${Number(g.totalSpent).toLocaleString()}` },
                      {
                        label: "Last stay",
                        value: g.lastCheckIn ? `${g.lastCheckIn} → ${g.lastCheckOut ?? "?"}` : "—",
                      },
                      { label: "First visit", value: g.firstBooking ?? "—" },
                    ]}
                    actions={
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-center gap-2 text-xs"
                        onClick={() => void openHistory(g)}
                      >
                        <History size={14} /> View history
                      </Button>
                    }
                  />
                ))}
              </div>
              <div className="hidden md:block overflow-x-auto">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Bookings</th>
                      <th>Total spent</th>
                      <th>Last stay</th>
                      <th>First visit</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((g) => (
                      <tr key={g.guestKey}>
                        <td className="font-semibold text-navy">{g.name}</td>
                        <td>
                          {g.email ? (
                            <a href={`mailto:${g.email}`} className="inline-flex items-center gap-1 text-slateBlue hover:underline text-xs">
                              <Mail size={11} /> {g.email}
                            </a>
                          ) : <span className="text-zinc-400">—</span>}
                        </td>
                        <td className="text-zinc-600">{g.phone ?? "—"}</td>
                        <td>
                          <span className="inline-flex items-center gap-1 rounded-full bg-navy/8 px-2 py-0.5 text-xs font-bold text-navy">
                            {g.reservationCount}
                          </span>
                        </td>
                        <td className="font-semibold text-emerald-700">₱{Number(g.totalSpent).toLocaleString()}</td>
                        <td className="text-zinc-600 text-xs">
                          {g.lastCheckIn ? `${g.lastCheckIn} → ${g.lastCheckOut ?? "?"}` : "—"}
                        </td>
                        <td className="text-zinc-500 text-xs">{g.firstBooking ?? "—"}</td>
                        <td className="text-right">
                          <button
                            type="button"
                            className="dash-btn-sm inline-flex items-center gap-1"
                            onClick={() => void openHistory(g)}
                          >
                            <History size={14} /> History
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </DashCard>
      )}

      {!loading && filtered.length > 0 && (
        <p className="flex items-center gap-2 text-xs text-zinc-400">
          <Download size={12} />
          Contact the admin to export a full guest report as CSV.
        </p>
      )}

      {historyOpen ? (
        <div className="fixed inset-0 z-[300] flex items-end justify-center bg-zinc-900/40 p-0 sm:items-center sm:p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="guest-history-title"
            className="flex max-h-[min(92vh,640px)] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-zinc-200 bg-white shadow-2xl sm:rounded-2xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-4 py-3 sm:px-5">
              <div>
                <h2 id="guest-history-title" className="font-dash text-lg font-semibold text-navy">
                  Reservation history
                </h2>
                <p className="text-xs text-zinc-500">{historyName}</p>
              </div>
              <button
                type="button"
                className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100"
                aria-label="Close"
                onClick={() => setHistoryOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5">
              {historyLoading ? <p className="text-sm text-zinc-500">Loading…</p> : null}
              {historyError ? <p className="text-sm text-rose-600">{historyError}</p> : null}
              {!historyLoading && !historyError && historyRows.length === 0 ? (
                <p className="text-sm text-zinc-500">No reservations for this guest.</p>
              ) : null}
              {!historyLoading && historyRows.length > 0 ? (
                <table className="dash-table text-sm">
                  <thead>
                    <tr>
                      <th>Reference</th>
                      <th>Room</th>
                      <th>Stay</th>
                      <th>Fee</th>
                      <th>Status</th>
                      <th>Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyRows.map((r) => (
                      <tr key={r.id}>
                        <td className="font-mono text-xs">{r.referenceNo}</td>
                        <td>{r.room?.name ?? "—"}</td>
                        <td className="text-xs text-zinc-600">
                          {r.checkInDate} → {r.checkOutDate}
                        </td>
                        <td>₱{Number(r.reservationFee).toLocaleString()}</td>
                        <td className="text-xs uppercase text-zinc-600">{r.status.replace("_", " ")}</td>
                        <td className="text-xs">{r.xenditPaymentStatus ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
