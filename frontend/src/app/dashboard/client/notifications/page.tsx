"use client";

import { useToast } from "@/components/shared/ToastProvider";
import { apiClient } from "@/lib/api/client";
import { Bell, Loader2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  href?: string;
};

type ApiEnvelope<T> = { success: boolean; message?: string; data: T };

export default function NotificationsPage() {
  const { pushToast } = useToast();
  const [notes, setNotes] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allReadVisual, setAllReadVisual] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get<ApiEnvelope<NotificationItem[]>>("/notifications");
      const list = Array.isArray(data.data) ? data.data : [];
      setNotes(list);
    } catch (err) {
      setError("Could not load notifications.");
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const markAll = async () => {
    const prevNotes = notes;
    setAllReadVisual(true);
    setNotes((n) => n.map((x) => ({ ...x, read: true })));
    try {
      await apiClient.post("/notifications/mark-all-read");
      pushToast({ title: "All caught up", description: "Notifications marked as read.", tone: "success" });
    } catch (err) {
      setAllReadVisual(false);
      setNotes(prevNotes);
      pushToast({
        title: "Couldn’t mark all as read",
        description: "Please try again. Your notification state was not changed.",
        tone: "error",
      });
    }
  };

  const displayRead = (n: NotificationItem) => n.read || allReadVisual;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="dash-page-title flex items-center gap-2">
          <Bell size={24} className="text-skyBlue" />
          Notifications
        </h1>
        <div className="ml-auto">
          <button type="button" onClick={() => void markAll()} className="dash-btn-sm" disabled={notes.length === 0}>
            Mark all as read
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-zinc-500">
          <Loader2 className="animate-spin" size={20} /> Loading…
        </div>
      ) : error ? (
        <div className="dash-alert-error">{error}</div>
      ) : notes.length === 0 ? (
        <div className="dash-card p-10 text-center text-zinc-500">You’re all caught up — no alerts right now.</div>
      ) : (
        <div className="dash-card divide-y divide-softBorder overflow-hidden p-0">
          {notes.map((n) => {
            const inner = (
              <>
                <div className="font-semibold text-navy">{n.title}</div>
                <div className="text-sm text-zinc-600">{n.body}</div>
              </>
            );
            return (
              <div key={n.id} className={`p-4 ${displayRead(n) ? "bg-softGray/30 opacity-80" : "bg-softCard"}`}>
                {n.href ? (
                  <Link href={n.href} className="block transition hover:opacity-90">
                    {inner}
                    <span className="mt-2 inline-block text-xs font-medium text-skyBlue">Open →</span>
                  </Link>
                ) : (
                  inner
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

