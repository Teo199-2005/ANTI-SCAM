"use client";

import RoomModal, { RoomFormValues } from "@/components/dashboard/RoomModal";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import {
  DashTableActionsCell,
  DashTableActionsHead,
  DashTableActionsInner,
} from "@/components/shared/DashTableActions";
import DashMobileTableCard from "@/components/shared/DashMobileTableCard";
import { useToast } from "@/components/shared/ToastProvider";
import { apiClient } from "@/lib/api/client";
import { listResorts, ResortItem } from "@/lib/api/resort";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";
import { BedDouble, CalendarDays, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type RoomItem = {
  id: number;
  resort_id: number;
  name: string;
  code: string | null;
  capacity: number;
  base_price: string;
  amenities: string[];
  rules: string | null;
  status: "active" | "inactive" | "maintenance";
};

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

const emptyRoom = (resortId = 0): RoomFormValues => ({
  resort_id: resortId,
  name: "",
  code: "",
  capacity: 1,
  base_price: 0,
  amenities: [],
  rules: "",
  status: "active",
});

const roomStatusClass: Record<string, string> = {
  active:      "dash-badge-emerald",
  inactive:    "dash-badge-slate",
  maintenance: "dash-badge-orange",
};

export default function ResortRoomsPage() {
  const [resort, setResort] = useState<ResortItem | null>(null);
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<RoomItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<RoomItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { pushToast } = useToast();

  const modalValues = useMemo<RoomFormValues>(() => {
    if (!editing) return emptyRoom(resort?.id ?? 0);
    return {
      resort_id: editing.resort_id,
      name: editing.name,
      code: editing.code ?? "",
      capacity: editing.capacity,
      base_price: Number(editing.base_price),
      amenities: editing.amenities ?? [],
      rules: editing.rules ?? "",
      status: editing.status,
    };
  }, [editing, resort?.id]);

  const load = async () => {
    setLoading(true);
    try {
      const resorts = await listResorts({ perPage: 10 });
      const first = resorts.data[0];
      setResort(first ?? null);
      if (!first) {
        setRooms([]);
        setError("No resort is assigned to this account yet.");
        return;
      }

      const { data } = await apiClient.get<ApiEnvelope<{ data: RoomItem[] }>>("/rooms", {
        params: { perPage: 50, resort_id: first.id },
      });
      const rows = data.data.data ?? [];
      setRooms(rows.filter((room) => room.resort_id === first.id));
      setError(null);
    } catch (err) {
      setError(parseApiErrorMessage(err, "Unable to load room inventory."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onSave = async (values: RoomFormValues) => {
    if (!resort) return;
    setSaving(true);
    try {
      if (editing) {
        await apiClient.put(`/rooms/${editing.id}`, {
          name: values.name,
          code: values.code || null,
          capacity: values.capacity,
          base_price: values.base_price,
          amenities: values.amenities,
          rules: values.rules || null,
          status: values.status,
        });
      } else {
        await apiClient.post("/rooms", {
          resort_id: resort.id,
          name: values.name,
          code: values.code || null,
          capacity: values.capacity,
          base_price: values.base_price,
          amenities: values.amenities,
          rules: values.rules || null,
          status: values.status,
        });
      }

      setModalOpen(false);
      setEditing(null);
      await load();
      pushToast({ title: editing ? "Room updated" : "Room created", tone: "success" });
    } catch (err) {
      pushToast({ title: "Save failed", description: parseApiErrorMessage(err, "Unable to save room details."), tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  const activeRoomsCount = rooms.filter((r) => r.status === 'active').length;
  const includedRooms = resort?.subscription?.included_rooms ?? Infinity;

  const onDelete = async (roomId: number) => {
    try {
      await apiClient.delete(`/rooms/${roomId}`);
      await load();
      pushToast({ title: "Room deleted", tone: "success" });
    } catch (err) {
      pushToast({ title: "Delete failed", description: parseApiErrorMessage(err, "Unable to delete room."), tone: "error" });
    } finally {
      setConfirmDelete(null);
    }
  };

  if (loading) {
    return <div className="dash-card p-8 text-center text-zinc-600">Loading rooms…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="dash-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="dash-page-title">Room management</h1>
            <p className="dash-page-sub">Add, edit, and maintain room statuses and pricing.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="dash-btn-primary inline-flex items-center gap-2 disabled:opacity-50"
              onClick={() => {
                setEditing(null);
                setModalOpen(true);
              }}
              disabled={!resort || activeRoomsCount >= includedRooms}
            >
              <Plus size={15} />
              Add room
            </button>
            {activeRoomsCount >= includedRooms ? (
              <div className="text-sm text-zinc-600">
                You've reached your plan's active room limit ({includedRooms}). <a href="/dashboard/resort/subscription?prefill=upgrade" className="text-skyBlue">Upgrade plan →</a>
              </div>
            ) : null}
          </div>
        </div>
        {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
      </div>

      <div className="md:hidden">
        {rooms.length === 0 ? (
          <div className="rounded-2xl border border-softBorder bg-softCard p-8 text-center text-sm text-zinc-600">
            No rooms found. Create your first room to begin accepting reservations.
          </div>
        ) : (
          <div className="space-y-3">
            {rooms.map((room) => (
              <DashMobileTableCard
                key={room.id}
                title={
                  <span className="inline-flex items-center gap-2">
                    <BedDouble size={16} className="shrink-0 text-skyBlue" />
                    {room.name}
                  </span>
                }
                fields={[
                  { label: "Code", value: room.code || "—" },
                  { label: "Capacity", value: String(room.capacity) },
                  { label: "Base price", value: `₱${Number(room.base_price).toLocaleString()}` },
                  {
                    label: "Status",
                    value: <span className={roomStatusClass[room.status] ?? "dash-badge-slate"}>{room.status}</span>,
                  },
                ]}
                actions={
                  <>
                    <button
                      type="button"
                      className="dash-btn-sm w-full justify-center"
                      onClick={() => {
                        setEditing(room);
                        setModalOpen(true);
                      }}
                    >
                      <Pencil size={14} />
                      Edit room
                    </button>
                    <Link
                      href={`/dashboard/resort/rooms/${room.id}/calendar`}
                      className="dash-btn-sm w-full justify-center"
                    >
                      <CalendarDays size={14} />
                      Availability calendar
                    </Link>
                    <button
                      type="button"
                      className="dash-btn-danger w-full justify-center"
                      onClick={() => setConfirmDelete(room)}
                    >
                      <Trash2 size={14} />
                      Delete room
                    </button>
                  </>
                }
              />
            ))}
          </div>
        )}
      </div>

      <div className="hidden md:block">
        <div className="dash-table-wrap">
          <div className="overflow-x-auto">
            <table className="dash-table min-w-[760px]">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Capacity</th>
                  <th>Base price</th>
                  <th>Status</th>
                  <DashTableActionsHead />
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => (
                  <tr key={room.id}>
                    <td>
                      <p className="inline-flex items-center gap-2 font-medium text-navy">
                        <BedDouble size={14} className="text-skyBlue" />
                        {room.name}
                      </p>
                    </td>
                    <td className="text-zinc-600">{room.code || "—"}</td>
                    <td className="text-zinc-700">{room.capacity}</td>
                    <td className="text-zinc-700">₱{Number(room.base_price).toLocaleString()}</td>
                    <td>
                      <span className={roomStatusClass[room.status] ?? "dash-badge-slate"}>{room.status}</span>
                    </td>
                    <DashTableActionsCell>
                      <DashTableActionsInner className="dash-table-actions-inner--toolbar">
                        <button
                          type="button"
                          className="dash-action-icon rounded-lg border border-softBorder bg-softCard/90 text-zinc-600 shadow-sm transition hover:bg-softCard hover:text-navy"
                          onClick={() => {
                            setEditing(room);
                            setModalOpen(true);
                          }}
                          aria-label="Edit room"
                        >
                          <Pencil size={14} />
                        </button>
                        <Link
                          href={`/dashboard/resort/rooms/${room.id}/calendar`}
                          className="dash-action-icon rounded-lg border border-softBorder bg-softCard/90 text-zinc-600 shadow-sm transition hover:bg-softCard hover:text-navy"
                          aria-label="Calendar"
                        >
                          <CalendarDays size={14} />
                        </Link>
                        <button
                          type="button"
                          className="dash-action-icon rounded-lg border border-rose-200 bg-rose-50 text-rose-700 transition hover:bg-rose-100"
                          onClick={() => setConfirmDelete(room)}
                          aria-label="Delete room"
                        >
                          <Trash2 size={14} />
                        </button>
                      </DashTableActionsInner>
                    </DashTableActionsCell>
                  </tr>
                ))}
                {rooms.length === 0 ? (
                  <tr>
                    <td className="py-8 text-center text-zinc-600" colSpan={6}>
                      No rooms found. Create your first room to begin accepting reservations.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <RoomModal
        open={modalOpen}
        title={editing ? "Edit room" : "Add room"}
        initialValues={modalValues}
        loading={saving}
        roomId={editing?.id}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSave={onSave}
      />
      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete room?"
        description={confirmDelete ? `Delete ${confirmDelete.name}. This cannot be undone.` : "Delete this room?"}
        confirmLabel="Delete"
        tone="danger"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) void onDelete(confirmDelete.id);
        }}
      />
    </div>
  );
}

