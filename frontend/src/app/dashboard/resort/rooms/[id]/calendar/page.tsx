"use client";

import AvailabilityCalendar from "@/components/dashboard/AvailabilityCalendar";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import DataTable from "@/components/shared/DataTable";
import DashMobileTableCard from "@/components/shared/DashMobileTableCard";
import {
  DashTableActionsCell,
  DashTableActionsHead,
  DashTableActionsInner,
} from "@/components/shared/DashTableActions";
import { useToast } from "@/components/shared/ToastProvider";
import { apiClient } from "@/lib/api/client";
import { sanitizeLongText } from "@/lib/inputRestrictions";
import { CalendarDays, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type RoomPayload = {
  id: number;
  name: string;
  status: string;
};

type AvailabilityRecord = {
  id: number;
  start_date: string;
  end_date: string;
  status: "available" | "blocked" | "maintenance";
  reason?: string | null;
};

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

export default function RoomCalendarPage() {
  const params = useParams<{ id: string }>();
  const roomId = params?.id;
  const [room, setRoom] = useState<RoomPayload | null>(null);
  const [records, setRecords] = useState<AvailabilityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<AvailabilityRecord["status"]>("blocked");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AvailabilityRecord | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const { pushToast } = useToast();

  const load = async () => {
    if (!roomId) return;
    setLoading(true);
    try {
      const [roomRes, availRes] = await Promise.all([
        apiClient.get<ApiEnvelope<RoomPayload>>(`/rooms/${roomId}`),
        apiClient.get<ApiEnvelope<{ data: AvailabilityRecord[] }>>(`/rooms/${roomId}/availability`),
      ]);
      setRoom(roomRes.data.data);
      setRecords(availRes.data.data.data ?? []);
      setError(null);
    } catch (err) {
      setError("Unable to load availability calendar.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [roomId]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId) return;
    setSaving(true);
    try {
      await apiClient.post(`/rooms/${roomId}/availability`, {
        start_date: startDate,
        end_date: endDate,
        status,
        reason: reason || null,
      });
      setStartDate("");
      setEndDate("");
      setReason("");
      await load();
      pushToast({ title: "Availability saved", tone: "success" });
    } catch (err) {
      pushToast({ title: "Could not save dates", description: "Check the dates and try again.", tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (record: AvailabilityRecord) => {
    if (!roomId) return;
    setDeletingId(record.id);
    try {
      await apiClient.delete(`/rooms/${roomId}/availability/${record.id}`);
      await load();
      pushToast({ title: "Date range deleted", tone: "success" });
    } catch (err) {
      pushToast({ title: "Delete failed", description: "Could not delete date range.", tone: "error" });
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  };

  if (loading) {
    return <div className="dash-card p-8 text-center text-zinc-600">Loading room calendar…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="dash-card p-6">
        <div className="dash-filter-bar w-full md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="dash-page-title inline-flex items-center gap-2">
              <CalendarDays size={24} className="text-skyBlue" />
              {room?.name ?? "Room"} calendar
            </h1>
            <p className="dash-page-sub">Manage blocked and maintenance dates to avoid overbooking conflicts.</p>
          </div>
          <Link href="/dashboard/resort/rooms" className="dash-btn-sm shrink-0 justify-center">
            Back to rooms
          </Link>
        </div>
        {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
      </div>

      <AvailabilityCalendar records={records} month={calendarMonth} onMonthChange={setCalendarMonth} />

      <form className="dash-card space-y-3 p-6" onSubmit={onSubmit}>
        <h2 className="font-dash text-xl text-navy">Block / update date range</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <input className="dash-input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
          <input className="dash-input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
        </div>
        <select className="dash-input" value={status} onChange={(e) => setStatus(e.target.value as AvailabilityRecord["status"])}>
          <option value="blocked">blocked</option>
          <option value="maintenance">maintenance</option>
          <option value="available">available</option>
        </select>
        <input
          className="dash-input"
          placeholder="Reason (optional)"
          value={reason}
          onChange={(e) => setReason(sanitizeLongText(e.target.value, 500))}
        />
        <button type="submit" disabled={saving} className="dash-btn-primary disabled:opacity-50">
          {saving ? "Saving…" : "Save date range"}
        </button>
      </form>

      <div className="dash-card p-6">
        <h2 className="font-dash text-xl text-navy">Recorded date ranges</h2>
        <div className="mt-3">
          {records.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-600">No date ranges recorded yet.</p>
          ) : (
            <>
              <div className="md:hidden space-y-3">
                {records.map((record) => (
                  <DashMobileTableCard
                    key={record.id}
                    title={`${record.start_date} → ${record.end_date}`}
                    fields={[
                      {
                        label: "Status",
                        value: (
                          <span className={record.status === "maintenance" ? "dash-badge-amber" : record.status === "blocked" ? "dash-badge-rose" : "dash-badge-emerald"}>
                            {record.status}
                          </span>
                        ),
                      },
                      { label: "Reason", value: record.reason || "—" },
                    ]}
                    actions={
                      <button
                        type="button"
                        disabled={deletingId === record.id}
                        onClick={() => setConfirmDelete(record)}
                        className="dash-btn-danger w-full justify-center"
                      >
                        <Trash2 size={12} />
                        Delete
                      </button>
                    }
                  />
                ))}
              </div>
              <div className="hidden md:block">
                <DataTable
                  headers={
                    <>
                      <th>Date range</th>
                      <th>Status</th>
                      <th>Reason</th>
                      <DashTableActionsHead srOnly>Row actions</DashTableActionsHead>
                    </>
                  }
                >
                  {records.map((record) => (
                    <tr key={record.id}>
                      <td className="font-medium text-navy">
                        {record.start_date} to {record.end_date}
                      </td>
                      <td>
                        <span className={record.status === "maintenance" ? "dash-badge-amber" : record.status === "blocked" ? "dash-badge-rose" : "dash-badge-emerald"}>
                          {record.status}
                        </span>
                      </td>
                      <td className="text-zinc-600">{record.reason || "—"}</td>
                      <DashTableActionsCell>
                        <DashTableActionsInner>
                          <button
                            type="button"
                            disabled={deletingId === record.id}
                            onClick={() => setConfirmDelete(record)}
                            className="dash-btn-danger"
                          >
                            <Trash2 size={12} />
                            Delete
                          </button>
                        </DashTableActionsInner>
                      </DashTableActionsCell>
                    </tr>
                  ))}
                </DataTable>
              </div>
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete date range?"
        description={
          confirmDelete
            ? `Remove ${confirmDelete.start_date} to ${confirmDelete.end_date} (${confirmDelete.status}).`
            : "Delete this record?"
        }
        confirmLabel="Delete"
        tone="danger"
        loading={deletingId !== null}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) void onDelete(confirmDelete);
        }}
      />
    </div>
  );
}
