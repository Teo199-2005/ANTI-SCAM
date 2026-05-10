"use client";

import DashCard from "@/components/dash/DashCard";
import { useToast } from "@/components/shared/ToastProvider";
import { apiClient } from "@/lib/api/client";
import { sanitizeLongText } from "@/lib/inputRestrictions";
import { AlertTriangle, ChevronLeft, Loader2, MessageSquare, Send } from "lucide-react";
import Link from "next/link";
import { use, useEffect, useState } from "react";

type Reservation = {
  id: number;
  reference_no: string;
  status: string;
  check_in_date: string;
  check_out_date: string;
  guest_count: number;
  reservation_fee: number;
  total_amount: number;
};

type StaffNote = {
  id: number;
  note: string;
  is_escalated: boolean;
  createdAt: string;
  author: { id: number; name: string } | null;
};

type RawStaffNote = {
  id: number;
  note: string;
  is_escalated?: boolean;
  isEscalated?: boolean;
  createdAt?: string;
  created_at?: string;
  author: { id: number; name: string } | null;
};

type ApiEnvelope<T> = { success: boolean; data: T };

const statusBadge: Record<string, string> = {
  confirmed:       "dash-badge-emerald",
  pending_payment: "dash-badge-amber",
  cancelled:       "dash-badge-rose",
  expired:         "dash-badge-slate",
  no_show:         "dash-badge-rose",
  completed:       "dash-badge-navy",
};

function normalizeStaffNote(note: RawStaffNote): StaffNote {
  return {
    ...note,
    is_escalated: Boolean(note.is_escalated ?? note.isEscalated),
    createdAt: note.createdAt ?? note.created_at ?? new Date().toISOString(),
  };
}

export default function StaffReservationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { pushToast } = useToast();
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [notes, setNotes] = useState<StaffNote[]>([]);
  const [loadingRes, setLoadingRes] = useState(true);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [note, setNote] = useState("");
  const [escalate, setEscalate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadRes = async () => {
      try {
        const { data } = await apiClient.get<ApiEnvelope<Reservation>>(`/reservations/${id}`);
        setReservation(data.data);
      } finally {
        setLoadingRes(false);
      }
    };

    const loadNotes = async () => {
      try {
        const { data } = await apiClient.get<ApiEnvelope<RawStaffNote[]>>(`/reservations/${id}/notes`);
        setNotes(Array.isArray(data.data) ? data.data.map(normalizeStaffNote) : []);
      } finally {
        setLoadingNotes(false);
      }
    };

    void loadRes();
    void loadNotes();
  }, [id]);

  const submitNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;
    setSubmitting(true);
    const wasEscalated = escalate;
    try {
      const { data } = await apiClient.post<ApiEnvelope<RawStaffNote>>(`/reservations/${id}/notes`, {
        note: note.trim(),
        is_escalated: escalate,
      });
      setNotes((prev) => [normalizeStaffNote(data.data), ...prev]);
      setNote("");
      setEscalate(false);
      pushToast({
        title: wasEscalated ? "Note added & escalated" : "Note added",
        description: wasEscalated ? "Admins can review this escalation." : "Your note was saved to this reservation.",
        tone: "success",
      });
    } catch (err) {
      pushToast({ title: "Couldn’t add note", description: "Try again in a moment.", tone: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingRes) return <div className="dash-card p-10 text-center text-zinc-500">Loading reservation…</div>;
  if (!reservation) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center text-rose-800">Reservation not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/dashboard/staff/reservations" className="dash-btn-sm">
          <ChevronLeft size={14} /> Back
        </Link>
        <h1 className="dash-page-title">Reservation Detail</h1>
      </div>

      {/* Reservation info */}
      <DashCard className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs text-zinc-400">Reference</p>
            <p className="font-mono text-xl font-bold text-navy">{reservation.reference_no}</p>
          </div>
          <span className={statusBadge[reservation.status] ?? "dash-badge-slate"}>
            {reservation.status.replaceAll("_", " ")}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:gap-3 md:grid-cols-3">
          {[
            { label: "Check-in",   value: reservation.check_in_date },
            { label: "Check-out",  value: reservation.check_out_date },
            { label: "Guests",     value: String(reservation.guest_count) },
            { label: "Fee paid",   value: `₱${Number(reservation.reservation_fee).toLocaleString()}` },
            { label: "Total",      value: `₱${Number(reservation.total_amount).toLocaleString()}` },
            { label: "Balance due", value: `₱${(Number(reservation.total_amount) - Number(reservation.reservation_fee)).toLocaleString()}` },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-softBorder/80 bg-softGray/80 p-3">
              <p className="text-xs text-zinc-400">{label}</p>
              <p className="font-semibold text-navy">{value}</p>
            </div>
          ))}
        </div>
      </DashCard>

      {/* Add note form */}
      <DashCard className="p-6">
        <h2 className="mb-4 flex items-center gap-2 font-dash text-base font-semibold text-navy">
          <MessageSquare size={16} className="text-slateBlue" /> Add Support Note
        </h2>

        <form onSubmit={submitNote} className="space-y-3">
          <textarea
            className="dash-input min-h-[100px] resize-none"
            placeholder="Add a support note, customer complaint, or follow-up action…"
            value={note}
            onChange={(e) => setNote(sanitizeLongText(e.target.value))}
            required
          />
          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
              <input
                type="checkbox"
                checked={escalate}
                onChange={(e) => setEscalate(e.target.checked)}
                className="h-4 w-4 rounded accent-rose-500"
              />
              <AlertTriangle size={14} className="text-amber-500" />
              Escalate to admin
            </label>
            <button type="submit" disabled={submitting || !note.trim()} className="dash-btn-primary disabled:opacity-60">
              {submitting ? <span className="inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" />Saving…</span> : <span className="inline-flex items-center gap-2"><Send size={14} />Add note</span>}
            </button>
          </div>
        </form>
      </DashCard>

      {/* Existing notes */}
      <DashCard className="overflow-hidden p-0">
        <div className="border-b border-softBorder px-6 py-4">
          <h2 className="font-dash text-base font-semibold text-navy">Support Notes</h2>
          <p className="text-xs text-zinc-400">{notes.length} note{notes.length !== 1 ? "s" : ""} on this reservation</p>
        </div>
        {loadingNotes ? (
          <div className="space-y-2 p-4">{[1,2].map(i=><div key={i} className="h-16 animate-pulse rounded-xl bg-softGray"/>)}</div>
        ) : notes.length === 0 ? (
          <p className="px-6 py-8 text-sm text-zinc-500">No notes yet. Add one above.</p>
        ) : (
          <div className="divide-y divide-softBorder">
            {notes.map((n) => (
              <div key={n.id} className={`px-6 py-4 ${n.is_escalated ? "bg-amber-50/50" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-zinc-700 flex-1">{n.note}</p>
                  {n.is_escalated ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                      <AlertTriangle size={9} /> Escalated
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-zinc-400">
                  {n.author?.name ?? "Staff"} · {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </DashCard>
    </div>
  );
}
