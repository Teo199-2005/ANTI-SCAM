"use client";

import { useToast } from "@/components/shared/ToastProvider";
import { useAuth } from "@/contexts/AuthContext";
import {
  getStoredReviews,
  hasReviewForReservation,
  saveReview,
  StoredClientReview,
} from "@/lib/client/reviews";
import { apiClient } from "@/lib/api/client";
import { sanitizeLongText } from "@/lib/inputRestrictions";
import { Loader2, Star } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type ReviewTab = "write" | "past";

type ReservationRow = {
  id: number;
  referenceNo: string;
  status: string;
  checkInDate: string;
  checkOutDate: string;
  resort?: { id: number; name: string; address?: string | null };
  room?: { id: number; name: string };
};

type Paginated = {
  success: boolean;
  data: { data: ReservationRow[] };
};

export default function ClientReviewsPage() {
  const { user } = useAuth();
  const { pushToast } = useToast();
  const userId = user?.id ?? 0;

  const [eligible, setEligible] = useState<ReservationRow[]>([]);
  const [past, setPast] = useState<StoredClientReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingRow, setEditingRow] = useState<ReservationRow | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<ReviewTab>("write");

  const refreshLocal = () => {
    if (userId) setPast(getStoredReviews(userId));
  };

  useEffect(() => {
    refreshLocal();
  }, [userId]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await apiClient.get<Paginated>("/reservations", {
          params: { status: "completed", perPage: 50 },
        });
        const rows = (data.data?.data ?? []) as ReservationRow[];
        setEligible(rows.filter((r) => !hasReviewForReservation(userId, r.id)));
      } catch (err) {
        setError("Could not load completed stays.");
        setEligible([]);
      } finally {
        setLoading(false);
      }
    };
    if (userId) void load();
    else setLoading(false);
  }, [userId]);

  const startReview = (r: ReservationRow) => {
    setEditingRow(r);
    setRating(5);
    setComment("");
  };

  const submitReview = () => {
    if (!editingRow || !userId) return;
    setSaving(true);
    try {
      saveReview(userId, {
        reservationId: editingRow.id,
        resortId: editingRow.resort?.id ?? 0,
        resortName: editingRow.resort?.name ?? "Resort",
        roomName: editingRow.room?.name ?? "Room",
        rating,
        comment: comment.trim() || "Great stay!",
      });
      setEligible((prev) => prev.filter((x) => x.id !== editingRow.id));
      refreshLocal();
      setEditingRow(null);
      setTab("past");
      pushToast({
        title: "Review saved",
        description: "Stored on this device — sync to the server when your API supports it.",
        tone: "success",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!userId) {
    return (
      <div className="dash-card p-8 text-center text-zinc-600">
        Sign in to manage reviews.
        <div className="mt-4">
          <Link href="/login" className="dash-btn-primary">
            Log in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="dash-page-title">My reviews</h1>
        <p className="dash-page-sub">Share feedback after completed stays. Reviews are saved on this device.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-zinc-500">
          <Loader2 className="animate-spin" size={20} /> Loading…
        </div>
      ) : error ? (
        <div className="dash-card border-rose-200 bg-rose-50 p-6 text-rose-800">{error}</div>
      ) : null}

      <div className="dash-card overflow-hidden p-0">
        <div className="flex border-b border-softBorder">
          <button
            type="button"
            onClick={() => setTab("write")}
            className={`flex-1 px-4 py-3 text-sm font-semibold transition ${
              tab === "write" ? "bg-softGray/60 text-navy" : "text-zinc-500 hover:bg-softGray/30 hover:text-zinc-700"
            }`}
          >
            Write a review
          </button>
          <button
            type="button"
            onClick={() => setTab("past")}
            className={`flex-1 px-4 py-3 text-sm font-semibold transition ${
              tab === "past" ? "bg-softGray/60 text-navy" : "text-zinc-500 hover:bg-softGray/30 hover:text-zinc-700"
            }`}
          >
            Past reviews
          </button>
        </div>

        <div className="p-6">
          {tab === "write" ? (
            <>
              <p className="text-sm text-zinc-500">Completed reservations without a review yet.</p>
              {eligible.length === 0 && !loading ? (
                <p className="mt-4 text-sm text-zinc-600">
                  No stays waiting for a review.{" "}
                  <Link href="/dashboard/client/explore" className="font-medium text-skyBlue hover:underline">
                    Explore resorts
                  </Link>
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-softBorder">
                  {eligible.map((r) => (
                    <li key={r.id} className="py-4">
                      {editingRow?.id === r.id ? (
                        <div className="space-y-3 rounded-xl border border-softBorder bg-softGray/40 p-4">
                          <p className="font-mono text-xs text-zinc-500">{r.referenceNo}</p>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => setRating(s)}
                                className="rounded p-1 text-amber-500 hover:bg-softGray"
                                aria-label={`${s} stars`}
                              >
                                <Star size={22} className={s <= rating ? "fill-amber-400 text-amber-500" : "text-zinc-300"} />
                              </button>
                            ))}
                          </div>
                          <textarea
                            className="dash-input min-h-[100px] w-full"
                            placeholder="Tell others about your stay…"
                            value={comment}
                            onChange={(e) => setComment(sanitizeLongText(e.target.value))}
                          />
                          <div className="flex gap-2">
                            <button type="button" disabled={saving} onClick={submitReview} className="dash-btn-primary">
                              {saving ? "Saving…" : "Submit review"}
                            </button>
                            <button type="button" onClick={() => setEditingRow(null)} className="dash-btn-sm">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-navy">{r.resort?.name ?? "Resort"}</p>
                            <p className="text-sm text-zinc-600">{r.room?.name ?? "Room"}</p>
                            <p className="text-xs text-zinc-400">
                              {r.checkInDate} → {r.checkOutDate}
                            </p>
                          </div>
                          <button type="button" onClick={() => startReview(r)} className="dash-btn-sm">
                            Write review
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : past.length === 0 ? (
            <p className="text-sm text-zinc-500">You haven’t submitted any reviews yet.</p>
          ) : (
            <ul className="space-y-4">
              {past.map((rv) => (
                <li key={rv.id} className="border-b border-softBorder pb-4 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-navy">{rv.resortName}</span>
                    <span className="text-amber-600">{"★".repeat(rv.rating)}{"☆".repeat(5 - rv.rating)}</span>
                  </div>
                  <p className="text-sm text-zinc-600">{rv.roomName}</p>
                  <p className="mt-2 text-sm text-zinc-700">{rv.comment}</p>
                  <p className="mt-1 text-xs text-zinc-400">{new Date(rv.createdAt).toLocaleString()}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

