"use client";

import DashCard from "@/components/dash/DashCard";
import { apiClient } from "@/lib/api/client";
import { sanitizeSearchQuery } from "@/lib/inputRestrictions";
import DashboardFilterSearch from "@/components/dashboard/DashboardFilterSearch";
import { AlertTriangle, ChevronLeft, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type StaffNote = {
  id: number;
  note: string;
  is_escalated: boolean;
  createdAt: string;
  author: { id: number; name: string } | null;
  reservation: { id: number; reference_no: string } | null;
};

type ApiEnvelope<T> = { success: boolean; data: T };

export default function StaffNotesPage() {
  const [notes, setNotes] = useState<StaffNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filterEscalated, setFilterEscalated] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get<ApiEnvelope<StaffNote[]>>("/staff/notes");
      setNotes(Array.isArray(data.data) ? data.data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const filtered = notes.filter((n) => {
    if (filterEscalated && !n.is_escalated) return false;
    if (query && !n.note.toLowerCase().includes(query.toLowerCase()) && !n.reservation?.reference_no?.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/dashboard/staff" className="dash-btn-sm">
          <ChevronLeft size={14} /> Back
        </Link>
        <div className="dash-page-header">
          <h1 className="dash-page-title flex items-center gap-2">
            <MessageSquare size={22} className="text-slateBlue" /> My Notes
          </h1>
          <p className="dash-page-sub">All support notes logged by you across all reservations.</p>
        </div>
      </div>

      <div className="dash-filter-bar">
        <DashboardFilterSearch
          value={query}
          onChange={(v) => setQuery(sanitizeSearchQuery(v))}
          placeholder="Search notes or reference…"
          wide
          live
        />
        <label className="flex h-8 cursor-pointer shrink-0 items-center gap-2 px-1 text-xs text-zinc-700">
          <input
            type="checkbox"
            checked={filterEscalated}
            onChange={(e) => setFilterEscalated(e.target.checked)}
            className="h-4 w-4 rounded accent-amber-500"
          />
          <AlertTriangle size={14} className="text-amber-500" />
          Escalated only
        </label>
        <button onClick={() => void load()} className="dash-btn-sm">Refresh</button>
      </div>

      {/* Stats row */}
      {!loading && (
        <div className="flex gap-3 flex-wrap text-sm">
          <span className="rounded-full bg-navy/8 px-3 py-1 text-navy font-medium">{notes.length} total</span>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800 font-medium">
            {notes.filter(n=>n.is_escalated).length} escalated
          </span>
        </div>
      )}

      {/* Notes list */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i=>(
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-softCard shadow-soft-sm" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <DashCard className="px-6 py-16 text-center">
          <MessageSquare size={32} className="mx-auto text-zinc-300 mb-3" />
          <p className="text-zinc-500">No notes found.</p>
        </DashCard>
      ) : (
        <div className="space-y-3">
          {filtered.map((n) => (
            <DashCard
              key={n.id}
              className={`px-6 py-4 ${n.is_escalated ? "border-l-4 border-amber-400" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm text-zinc-700">{n.note}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                    {n.reservation ? (
                      <Link href={`/dashboard/staff/reservations/${n.reservation.id}`} className="font-mono text-slateBlue hover:underline">
                        {n.reservation.reference_no}
                      </Link>
                    ) : null}
                    <span>·</span>
                    <span>{new Date(n.createdAt).toLocaleString()}</span>
                  </div>
                </div>
                {n.is_escalated ? (
                  <span className="dash-badge-orange shrink-0">
                    Escalated
                  </span>
                ) : null}
              </div>
            </DashCard>
          ))}
        </div>
      )}
    </div>
  );
}
