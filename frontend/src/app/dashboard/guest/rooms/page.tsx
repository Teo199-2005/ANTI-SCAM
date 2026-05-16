"use client";

import DashCard from "@/components/dash/DashCard";
import BulkActionBar from "@/components/shared/BulkActionBar";
import { BulkSelectMobile } from "@/components/shared/BulkSelectCheckbox";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { useToast } from "@/components/shared/ToastProvider";
import { ResortRoomDetailsBookingModal } from "@/components/resort-page/ResortRoomDetailsBookingModal";
import type { LandingComputedRoom, LandingRoomImage } from "@/lib/api/landingPage";
import { apiClient } from "@/lib/api/client";
import { bulkDeleteGuestFavorites, bulkDeleteToastDescription } from "@/lib/api/bulkDelete";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { normalizeRoomImages, roomImageDisplaySrc } from "@/lib/roomImagePreview";
import { amenityMeta, extractRoomMeta, formatPhp, formatPhpPerNight } from "@/lib/roomPreviewDisplay";
import { displayInclusionLabel, isCustomInclusionToken } from "@/lib/roomInclusions";
import { BedDouble, Heart, ImageOff, Loader2, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type RoomRow = {
  id: number;
  name: string;
  code: string;
  capacity: number;
  basePrice: number;
  amenities: string[];
  rules: string | null;
  images: LandingRoomImage[];
  reservationFee: number;
};

type GuestResort = { id: number; slug: string };

function roomRowToLanding(r: RoomRow): LandingComputedRoom {
  return {
    id: r.id,
    name: r.name,
    capacity: r.capacity,
    basePrice: Number(r.basePrice),
    amenities: r.amenities ?? [],
    rules: r.rules,
    images: r.images ?? [],
  };
}

export default function GuestRoomsPage() {
  const { pushToast } = useToast();
  const [resort, setResort] = useState<GuestResort | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<LandingComputedRoom | null>(null);
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [favIds, setFavIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [confirmBulkRemove, setConfirmBulkRemove] = useState(false);
  const [bulkRemoving, setBulkRemoving] = useState(false);

  const favoriteRooms = useMemo(() => rooms.filter((r) => favIds.has(r.id)), [rooms, favIds]);
  const bulk = useBulkSelection(favoriteRooms, (r) => r.id);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rResort, rRooms, rFav] = await Promise.all([
        apiClient.get<{ success: boolean; data: GuestResort }>("/guest/resort"),
        apiClient.get<{ success: boolean; data: RoomRow[] }>("/guest/rooms"),
        apiClient.get<{ success: boolean; data: unknown }>("/guest/favorites"),
      ]);
      const d = rResort.data.data;
      setResort(d?.id != null && d.slug != null ? { id: d.id, slug: d.slug } : null);
      setRooms(Array.isArray(rRooms.data.data) ? rRooms.data.data : []);
      const raw = rFav.data.data;
      const favList = Array.isArray(raw) ? raw : [];
      setFavIds(new Set(favList.map((x: { id: number }) => x.id)));
    } catch {
      setRooms([]);
      setFavIds(new Set());
      setResort(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleFav = async (e: React.MouseEvent, roomId: number) => {
    e.preventDefault();
    e.stopPropagation();
    setBusyId(roomId);
    try {
      if (favIds.has(roomId)) {
        await apiClient.delete(`/guest/favorites/${roomId}`);
        setFavIds((prev) => {
          const n = new Set(prev);
          n.delete(roomId);
          return n;
        });
        if (bulk.isSelected(roomId)) bulk.toggle(roomId);
      } else {
        await apiClient.post("/guest/favorites", { room_id: roomId });
        setFavIds((prev) => new Set(prev).add(roomId));
      }
    } finally {
      setBusyId(null);
    }
  };

  const onBulkRemoveFavorites = async () => {
    const ids = bulk.selectedIds.map((id) => Number(id)).filter((id) => id > 0);
    if (ids.length === 0) return;
    setBulkRemoving(true);
    try {
      const result = await bulkDeleteGuestFavorites(ids);
      setFavIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      bulk.clear();
      pushToast({
        title: result.failed.length ? "Bulk remove completed with errors" : "Favorites removed",
        description: bulkDeleteToastDescription(result),
        tone: result.failed.length ? "warning" : "success",
      });
    } catch (err) {
      pushToast({
        title: "Bulk remove failed",
        description: parseApiErrorMessage(err, "Could not remove selected favorites."),
        tone: "error",
      });
    } finally {
      setBulkRemoving(false);
      setConfirmBulkRemove(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="dash-page-title">Rooms at your resort</h1>
        <p className="dash-page-sub">Active listings you can book. Save favorites for quick access.</p>
      </div>

      <BulkActionBar
        count={bulk.selectedCount}
        onClear={bulk.clear}
        onDelete={() => setConfirmBulkRemove(true)}
        deleting={bulkRemoving}
        deleteLabel="Remove from favorites"
      />

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 className="animate-spin" size={16} /> Loading rooms…
        </div>
      ) : rooms.length === 0 ? (
        <DashCard className="p-8 text-center text-zinc-500">No active rooms are available right now.</DashCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => {
            const primaryImage = normalizeRoomImages(room.images)[0];
            const { bedCount, bedType, visibleAmenities } = extractRoomMeta(room.amenities ?? []);
            const isFav = favIds.has(room.id);
            return (
              <article
                key={room.id}
                role="button"
                tabIndex={0}
                aria-label={`${room.name}. Open room details and booking.`}
                className="group flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-xl border border-zinc-200/80 bg-white p-0 shadow-sm transition hover:-translate-y-px hover:shadow-md"
                onClick={() => setSelectedRoom(roomRowToLanding(room))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedRoom(roomRowToLanding(room));
                  }
                }}
              >
                <div className="relative aspect-[2/1] w-full overflow-hidden bg-zinc-100">
                  {primaryImage ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={roomImageDisplaySrc(room.id, primaryImage, "session")}
                        alt={room.name}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                      />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy/10 via-transparent to-transparent" />
                    </>
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-zinc-100 to-zinc-200 text-[11px] text-zinc-500">
                      <ImageOff size={14} />
                      <span>No photo yet</span>
                    </div>
                  )}
                  {isFav ? (
                    <div
                      className="absolute left-2 top-2 z-10 rounded-lg border border-white/80 bg-white/90 p-1.5 shadow-sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <BulkSelectMobile
                        checked={bulk.isSelected(room.id)}
                        onChange={() => bulk.toggle(room.id)}
                        ariaLabel={`Select ${room.name} for bulk remove`}
                      />
                    </div>
                  ) : null}
                  <button
                    type="button"
                    aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
                    className="absolute right-2 top-2 z-10 rounded-lg border border-white/80 bg-white/90 p-2 text-rose-500 shadow-sm backdrop-blur-sm transition hover:bg-white"
                    disabled={busyId === room.id}
                    onClick={(e) => void toggleFav(e, room.id)}
                  >
                    {busyId === room.id ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <Heart size={16} className={isFav ? "fill-current" : ""} />
                    )}
                  </button>
                </div>

                <div className="flex flex-1 flex-col p-3">
                  <h2 className="min-h-0 text-left font-heading text-sm font-semibold leading-tight text-navy line-clamp-2">
                    {room.name}
                  </h2>
                  {room.code ? <p className="mt-0.5 text-[10px] text-zinc-400">{room.code}</p> : null}

                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-0.5 rounded-full border border-zinc-200/90 bg-zinc-50/90 px-2 py-px text-[10px] font-medium text-zinc-800">
                      <Users size={10} className="shrink-0 text-zinc-500" aria-hidden />
                      {room.capacity} {room.capacity === 1 ? "guest" : "guests"}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-zinc-300/80 bg-white px-2 py-px text-[10px] font-semibold text-zinc-800">
                      {formatPhpPerNight(Number(room.basePrice))}
                    </span>
                    {bedCount ? (
                      <span className="inline-flex items-center gap-0.5 rounded-full border border-zinc-200/90 bg-zinc-50/90 px-2 py-px text-[10px] font-medium text-zinc-800">
                        <BedDouble size={10} className="shrink-0 text-zinc-500" aria-hidden />
                        {bedCount} {bedCount === 1 ? "bed" : "beds"}
                      </span>
                    ) : null}
                    {bedType ? (
                      <span className="inline-flex items-center rounded-full border border-zinc-200/90 bg-white px-2 py-px text-[10px] font-medium text-zinc-700">
                        {bedType}
                      </span>
                    ) : null}
                  </div>

                  {visibleAmenities.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap content-start gap-1">
                      {visibleAmenities.slice(0, 4).map((a) => {
                        const meta = amenityMeta(a);
                        const Icon = meta.icon;
                        return (
                          <span
                            key={a}
                            className="inline-flex items-center gap-0.5 rounded-full border border-zinc-200/90 bg-white/90 px-1.5 py-px text-[9px] font-medium text-zinc-700"
                          >
                            <Icon
                              size={9}
                              className={`shrink-0 ${isCustomInclusionToken(a) ? "text-amber-500" : "text-zinc-500"}`}
                              aria-hidden
                            />
                            {displayInclusionLabel(a)}
                          </span>
                        );
                      })}
                      {visibleAmenities.length > 4 && (
                        <span className="rounded-full border border-zinc-200 px-1.5 py-px text-[9px] text-zinc-400">
                          +{visibleAmenities.length - 4} more
                        </span>
                      )}
                    </div>
                  )}

                  <p className="mt-2 line-clamp-2 text-[10px] leading-snug text-zinc-500">
                    {room.rules?.trim() || "Comfortable stay with guest-first amenities."}
                  </p>
                  <p className="mt-1 text-[10px] text-zinc-400">
                    Reservation fee {formatPhp(Number(room.reservationFee))}
                  </p>

                  <div className="mt-2 border-t border-zinc-200/90 pt-2">
                    <span className="inline-flex w-full items-center justify-center rounded-lg border border-emerald-600/90 bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition group-hover:bg-emerald-700">
                      Book now
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {resort ? (
        <ResortRoomDetailsBookingModal
          room={selectedRoom}
          resortId={resort.id}
          imageAccess="session"
          onClose={() => setSelectedRoom(null)}
        />
      ) : null}

      <ConfirmDialog
        open={confirmBulkRemove}
        title="Remove from favorites?"
        description={`Remove ${bulk.selectedCount} saved room${bulk.selectedCount === 1 ? "" : "s"} from your favorites.`}
        confirmLabel="Remove selected"
        tone="danger"
        loading={bulkRemoving}
        onCancel={() => setConfirmBulkRemove(false)}
        onConfirm={() => void onBulkRemoveFavorites()}
      />
    </div>
  );
}
