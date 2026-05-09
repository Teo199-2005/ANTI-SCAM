"use client";

import ConfirmDialog from "@/components/shared/ConfirmDialog";
import RoomModal, { RoomFormValues } from "@/components/dashboard/RoomModal";
import DashModal from "@/components/dash/DashModal";
import {
  DashTableActionsCell,
  DashTableActionsHead,
  DashTableActionsInner,
} from "@/components/shared/DashTableActions";
import DashMobileTableCard from "@/components/shared/DashMobileTableCard";
import { useToast } from "@/components/shared/ToastProvider";
import { apiClient } from "@/lib/api/client";
import { listResorts, ResortItem } from "@/lib/api/resort";
import { createSubscriptionInvoice } from "@/lib/api/subscription";
import {
  SLOT_PREPAY_LABELS,
  slotPrepayMonthlyRate,
  slotPrepayTotal,
  type SlotPrepayDuration,
} from "@/lib/billing/slotPrepay";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";
import {
  BedDouble,
  CalendarDays,
  CheckCircle2,
  Crown,
  Loader2,
  PackagePlus,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

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

const roomStatusClass: Record<string, string> = {
  active:      "dash-badge-emerald",
  inactive:    "dash-badge-slate",
  maintenance: "dash-badge-orange",
};

export default function ResortRoomsPage() {
  const [resort, setResort] = useState<ResortItem | null>(null);
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<RoomItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createSaving, setCreateSaving] = useState(false);
  const [payingForRoomSlot, setPayingForRoomSlot] = useState(false);
  const [roomAddonOpen, setRoomAddonOpen] = useState(false);
  const [roomAddonQuantity, setRoomAddonQuantity] = useState(1);
  const [roomAddonDuration, setRoomAddonDuration] = useState<SlotPrepayDuration>(1);
  const [error, setError] = useState<string | null>(null);
  const { pushToast } = useToast();

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

      const { data } = await apiClient.get<ApiEnvelope<{ data?: RoomItem[] } | RoomItem[]>>("/rooms", {
        params: { perPage: 50, resort_id: first.id },
      });
      const payload = data.data as { data?: RoomItem[] } | RoomItem[] | undefined;
      const rows = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : [];
      const firstResortId = Number(first.id);
      setRooms(rows.filter((room) => Number(room.resort_id) === firstResortId));
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

  const activeRoomsCount = rooms.filter((r) => r.status === 'active').length;
  const totalRoomsCount = rooms.length;
  const includedRooms = resort?.subscription?.included_rooms ?? Infinity;
  const subIncludedCap = resort?.subscription?.included_rooms;
  const slotsRemaining =
    typeof subIncludedCap === "number"
      ? Math.max(0, subIncludedCap - activeRoomsCount)
      : null;
  const extraRoomFee = Number(resort?.subscription?.extra_room_fee ?? 300);
  const slotMonthlyPrepay = slotPrepayMonthlyRate(extraRoomFee, roomAddonDuration);
  const addonPrepayTotal = slotPrepayTotal(extraRoomFee, roomAddonDuration, roomAddonQuantity);
  const atIncludedRoomLimit = resort ? activeRoomsCount >= includedRooms : false;

  const openRoomAddonModal = () => {
    setRoomAddonQuantity(1);
    setRoomAddonDuration(1);
    setRoomAddonOpen(true);
  };

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

  const onCreateRoom = async (values: RoomFormValues) => {
    setCreateSaving(true);
    try {
      const normalizedInclusions = Array.from(new Set(values.inclusions));
      const normalizedAmenities = Array.from(new Set(values.amenities.filter(Boolean)));
      const response = await apiClient.post<ApiEnvelope<RoomItem>>("/rooms", {
        resort_id: values.resort_id,
        name: values.name,
        code: values.code || null,
        capacity: values.capacity,
        base_price: values.base_price,
        amenities: [
          `BED_COUNT:${values.bed_count}`,
          `BED_TYPE:${values.bed_type}`,
          ...normalizedInclusions,
          ...normalizedAmenities,
        ],
        rules: values.rules || null,
        status: values.status,
      });
      const created = (response.data?.data ?? null) as RoomItem | null;
      if (created && Number(created.resort_id) === Number(values.resort_id)) {
        setRooms((prev) => [created, ...prev.filter((r) => r.id !== created.id)]);
        setError(null);
      }
      pushToast({
        title: "Room saved",
        description: `${values.name} is now in your room list.`,
        tone: "success",
      });
      setCreateOpen(false);
      try {
        await load();
      } catch {
        // Keep success toast shown even if refresh request fails.
      }
    } catch (err) {
      pushToast({
        title: "Save failed",
        description: parseApiErrorMessage(err, "Unable to save room details."),
        tone: "error",
      });
    } finally {
      setCreateSaving(false);
    }
  };

  const onPayToAddRoom = async () => {
    if (!resort?.id) {
      pushToast({ title: "Resort not found", description: "Reload and try again.", tone: "error" });
      return;
    }
    if (roomAddonQuantity < 1) {
      pushToast({ title: "Invalid quantity", description: "Room quantity must be at least 1.", tone: "warning" });
      return;
    }
    setPayingForRoomSlot(true);
    try {
      const result = await createSubscriptionInvoice(
        resort.id,
        false,
        undefined,
        undefined,
        "room_addon",
        roomAddonQuantity,
        roomAddonDuration,
        typeof window !== "undefined" ? window.location.origin : undefined,
      );
      setRoomAddonOpen(false);
      window.location.href = result.invoice_url;
    } catch (err) {
      pushToast({
        title: "Unable to start payment",
        description: parseApiErrorMessage(err, "Please try again from the topbar Subscribe now button."),
        tone: "error",
      });
    } finally {
      setPayingForRoomSlot(false);
    }
  };

  if (loading) {
    return <div className="dash-card p-8 text-center text-zinc-600">Loading rooms…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="dash-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="dash-page-title">Room management</h1>
            <p className="dash-page-sub">Add, edit, and maintain room statuses and pricing.</p>
            {resort?.subscription ? (
              <div className="mt-4 flex flex-col gap-2 rounded-xl border border-softBorder bg-softCard/80 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-1">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-900">
                  <BedDouble size={18} className="shrink-0 text-skyBlue" aria-hidden />
                  Plan room capacity
                </span>
                <p className="text-sm text-zinc-700">
                  <span className="font-medium text-zinc-900">{activeRoomsCount}</span> active
                  {totalRoomsCount !== activeRoomsCount ? (
                    <>
                      {" "}
                      (<span className="tabular-nums">{totalRoomsCount}</span> total listed)
                    </>
                  ) : null}{" "}
                  of{" "}
                  <span className="font-medium text-zinc-900">
                    {typeof subIncludedCap === "number" ? subIncludedCap : "—"}
                  </span>{" "}
                  included
                  {slotsRemaining !== null ? (
                    <>
                      {" "}
                      ·{" "}
                      {slotsRemaining > 0 ? (
                        <span className="font-medium text-emerald-800">
                          {slotsRemaining} slot{slotsRemaining === 1 ? "" : "s"} available
                        </span>
                      ) : (
                        <span className="font-medium text-amber-900">At included limit — buy slots to add more</span>
                      )}
                    </>
                  ) : null}
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                  <p className="text-xs text-zinc-500">
                    Extra slots:{" "}
                    <span className="font-mono font-medium text-zinc-700">₱{extraRoomFee.toLocaleString()}</span>
                    /mo each
                  </p>
                  <button
                    type="button"
                    onClick={openRoomAddonModal}
                    disabled={payingForRoomSlot || !resort?.subscription}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-primaryBlue/25 bg-primaryBlue/10 px-3 py-2 text-xs font-semibold text-primaryBlue shadow-sm transition hover:bg-primaryBlue/15 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {payingForRoomSlot ? <Loader2 size={14} className="animate-spin" /> : <PackagePlus size={14} />}
                    {payingForRoomSlot ? "Opening checkout…" : "Buy extra room slots"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            {!resort || activeRoomsCount >= includedRooms ? (
              <button
                type="button"
                className="dash-btn-primary inline-flex items-center gap-2 opacity-50"
                disabled
              >
                <Plus size={15} />
                Add room
              </button>
            ) : (
              <button
                type="button"
                className="dash-btn-primary inline-flex items-center gap-2"
                onClick={() => setCreateOpen(true)}
              >
                <Plus size={15} />
                Add room
              </button>
            )}
            {activeRoomsCount >= includedRooms ? (
              <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-600">
                <span>
                  You've reached your plan's active room limit ({includedRooms}). Pay now to continue adding rooms.
                </span>
                <button
                  type="button"
                  onClick={openRoomAddonModal}
                  disabled={payingForRoomSlot}
                  className="inline-flex items-center gap-2 rounded-lg border border-primaryBlue/20 bg-primaryBlue/10 px-3 py-1.5 text-xs font-semibold text-primaryBlue hover:bg-primaryBlue/15 disabled:opacity-60"
                >
                  {payingForRoomSlot ? <Loader2 size={12} className="animate-spin" /> : <PackagePlus size={12} />}
                  {payingForRoomSlot ? "Opening checkout…" : "Buy extra room slots"}
                </button>
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
                    <Link href={`/dashboard/resort/rooms/${room.id}/edit`} className="dash-btn-sm w-full justify-center">
                      <Pencil size={14} />
                      Edit room
                    </Link>
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
                        <Link
                          href={`/dashboard/resort/rooms/${room.id}/edit`}
                          className="dash-action-icon rounded-lg border border-softBorder bg-softCard/90 text-zinc-600 shadow-sm transition hover:bg-softCard hover:text-navy"
                          aria-label="Edit room"
                        >
                          <Pencil size={14} />
                        </Link>
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
      <RoomModal
        open={createOpen}
        title="Add room"
        loading={createSaving}
        onClose={() => {
          if (!createSaving) setCreateOpen(false);
        }}
        onSave={onCreateRoom}
        initialValues={{
          resort_id: resort?.id ?? 0,
          name: "",
          code: "",
          capacity: 1,
          base_price: 0,
          bed_count: 1,
          bed_type: "Double",
          inclusions: [],
          amenities: [],
          rules: "",
          status: "active",
        }}
      />

      <DashModal
        open={roomAddonOpen}
        onClose={() => {
          if (!payingForRoomSlot) setRoomAddonOpen(false);
        }}
        title={
          <span className="inline-flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primaryBlue/15 to-slateBlue/10 text-primaryBlue">
              <PackagePlus size={18} strokeWidth={2} />
            </span>
            Buy extra room slots
          </span>
        }
        description="Prepay extra slot fees at a discounted rate—same duration options as your main plan."
        className="max-w-[min(100vw-1rem,36rem)] md:max-w-xl"
      >
        <div className="space-y-5">
          <div className="relative overflow-hidden rounded-2xl border border-primaryBlue/15 bg-gradient-to-br from-primaryBlue/[0.07] via-white to-slate-50 p-5 shadow-[0_12px_40px_-18px_rgba(13,30,66,0.2)]">
            <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-primaryBlue/10 blur-2xl" />
            <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-primaryBlue">
              <Sparkles size={13} className="shrink-0" />
              Room capacity
            </p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-700">
              {atIncludedRoomLimit
                ? "You’re at your included active-room limit. Unlock more slots now—your limit updates as soon as payment is confirmed."
                : "Raise your included room limit anytime. Longer prepay windows use the same discounted monthly rates as your subscription."}
            </p>
            <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-zinc-600">
              <CalendarDays size={14} className="text-zinc-500" />
              Prepay period (applies per slot)
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {SLOT_PREPAY_LABELS.map(({ duration, billingType }) => {
                const active = roomAddonDuration === duration;
                return (
                  <button
                    key={`slot-duration-${duration}`}
                    type="button"
                    onClick={() => setRoomAddonDuration(duration)}
                    disabled={payingForRoomSlot}
                    className={`rounded-xl border px-2 py-2.5 text-left transition disabled:opacity-60 ${
                      active
                        ? "border-primaryBlue bg-primaryBlue/10 ring-1 ring-primaryBlue/30"
                        : "border-softBorder bg-white hover:border-primaryBlue/35"
                    }`}
                  >
                    <p className="inline-flex items-center gap-1 text-xs font-bold text-navy">
                      <CalendarDays size={12} className={active ? "text-primaryBlue" : "text-zinc-500"} />
                      {duration} mo{duration > 1 ? "s" : ""}
                    </p>
                    <p className="text-[11px] text-zinc-500">{billingType}</p>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap items-end gap-x-2 gap-y-1">
              <p className="inline-flex items-end gap-2 text-3xl font-black leading-none tracking-tight text-zinc-950 sm:text-4xl">
                <WalletCards size={20} className="mb-1 text-primaryBlue" />
                ₱{slotMonthlyPrepay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="pb-1 text-xs font-medium lowercase text-zinc-500">/ slot / month (prepay tier)</p>
            </div>
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-zinc-500">
              <Crown size={13} className="text-primaryBlue" />
              Total due now:{" "}
              <span className="font-semibold text-navy">
                ₱{addonPrepayTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </p>
          </div>

          <div className="rounded-xl border border-softBorder bg-white p-4">
            <label htmlFor="room-addon-qty" className="mb-2 block text-sm font-semibold text-navy">
              How many slots?
            </label>
            <input
              id="room-addon-qty"
              type="number"
              min={1}
              max={50}
              value={roomAddonQuantity}
              onChange={(e) => {
                const val = Number(e.target.value || 1);
                setRoomAddonQuantity(Number.isFinite(val) ? Math.max(1, Math.min(50, Math.floor(val))) : 1);
              }}
              className="dash-input max-w-[200px]"
            />
            <p className="mt-2 text-xs text-zinc-500">
              List price per slot overage is ₱{extraRoomFee.toLocaleString()}/mo; prepay uses the tiered rate above for{" "}
              {roomAddonDuration} month{roomAddonDuration > 1 ? "s" : ""}.
            </p>
          </div>

          <ul className="grid gap-2 text-sm text-zinc-700 sm:grid-cols-2">
            <li className="inline-flex items-start gap-2">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
              Slots are added to your plan immediately after payment
            </li>
            <li className="inline-flex items-start gap-2">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
              Same 1 / 3 / 6 / 12‑month prepay discounts as subscribe
            </li>
          </ul>

          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
            VAT and final totals are confirmed on the Xendit checkout page.
          </div>

          <div className="rounded-xl border border-primaryBlue/15 bg-primaryBlue/5 p-4">
            <p className="text-sm font-semibold text-navy">Summary</p>
            <div className="mt-2 space-y-1 text-sm text-zinc-700">
              <p>
                Slots: <span className="font-medium text-navy">{roomAddonQuantity}</span>
              </p>
              <p>
                Prepay: <span className="font-medium text-navy">{roomAddonDuration}</span> month
                {roomAddonDuration > 1 ? "s" : ""}
              </p>
              <p>
                Effective rate: ₱{slotMonthlyPrepay.toLocaleString(undefined, { minimumFractionDigits: 2 })} ×{" "}
                {roomAddonQuantity} × {roomAddonDuration}
              </p>
              <p className="border-t border-primaryBlue/10 pt-2 font-semibold text-navy">
                Total: ₱{addonPrepayTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setRoomAddonOpen(false)}
              disabled={payingForRoomSlot}
              className="rounded-xl border border-softBorder bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void onPayToAddRoom()}
              disabled={payingForRoomSlot}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primaryBlue to-slateBlue px-5 py-2.5 text-sm font-semibold text-white shadow-soft-sm transition-[transform,filter] hover:-translate-y-px hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {payingForRoomSlot ? <Loader2 size={14} className="animate-spin" /> : <WalletCards size={16} />}
              {payingForRoomSlot ? "Opening checkout…" : "Pay with Xendit"}
            </button>
          </div>
        </div>
      </DashModal>
    </div>
  );
}

