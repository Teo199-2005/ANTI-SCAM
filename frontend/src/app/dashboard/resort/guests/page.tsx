"use client";

import DashCard from "@/components/dash/DashCard";
import DashMobileTableCard, { DashMobileTableSkeleton } from "@/components/shared/DashMobileTableCard";
import { apiClient } from "@/lib/api/client";
import { sanitizeSearchQuery } from "@/lib/inputRestrictions";
import { Download, Mail, Search, Users } from "lucide-react";
import { useEffect, useState } from "react";

type Guest = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  reservationCount: number;
  lastCheckIn: string | null;
  lastCheckOut: string | null;
  totalSpent: number;
  firstBooking: string | null;
};

type ApiEnvelope<T> = { success: boolean; data: T | { data: T } };

export default function ResortGuestsPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = async (q = "") => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get<ApiEnvelope<Guest[]>>("/resort/guests", {
        params: { search: q || undefined, perPage: 100 },
      });
      const payload = data.data;
      if (Array.isArray(payload)) {
        setGuests(payload);
      } else {
        setGuests(Array.isArray(payload?.data) ? payload.data : []);
      }
    } catch (err) {
      setError("Failed to load guest list.");
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
      {/* Header */}
      <div>
        <h1 className="dash-page-title flex items-center gap-2">
          <Users size={24} className="text-skyBlue" /> Guest Directory
        </h1>
        <p className="dash-page-sub">All guests derived from your reservations and booking history.</p>
      </div>

      {/* Search bar + stats */}
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

      {/* Table */}
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-800">{error}</div>
      ) : (
        <DashCard className="overflow-hidden p-0">
          {loading ? (
            <>
              <div className="md:hidden p-4"><DashMobileTableSkeleton rows={5} /></div>
              <div className="hidden md:block space-y-2 p-4">
                {[1,2,3,4,5].map(i => <div key={i} className="h-12 animate-pulse rounded-xl bg-softGray" />)}
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
                    key={g.id}
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
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((g) => (
                      <tr key={g.id}>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </DashCard>
      )}

      {/* Export note */}
      {!loading && filtered.length > 0 && (
        <p className="flex items-center gap-2 text-xs text-zinc-400">
          <Download size={12} />
          Contact the admin to export a full guest report as CSV.
        </p>
      )}
    </div>
  );
}

