"use client";

import DashCard from "@/components/dash/DashCard";
import { apiClient } from "@/lib/api/client";
import { Heart, Loader2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type RoomRow = {
  id: number;
  name: string;
  code: string;
  capacity: number;
  basePrice: number;
  reservationFee: number;
};

type GuestResort = { slug: string };

export default function GuestRoomsPage() {
  const [slug, setSlug] = useState<string | null>(null);
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [favIds, setFavIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rResort, rRooms, rFav] = await Promise.all([
        apiClient.get<{ success: boolean; data: GuestResort }>("/guest/resort"),
        apiClient.get<{ success: boolean; data: RoomRow[] }>("/guest/rooms"),
        apiClient.get<{ success: boolean; data: unknown }>("/guest/favorites"),
      ]);
      setSlug(rResort.data.data?.slug ?? null);
      setRooms(Array.isArray(rRooms.data.data) ? rRooms.data.data : []);
      const raw = rFav.data.data;
      const favList = Array.isArray(raw) ? raw : [];
      setFavIds(new Set(favList.map((x: { id: number }) => x.id)));
    } catch {
      setRooms([]);
      setFavIds(new Set());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleFav = async (roomId: number) => {
    setBusyId(roomId);
    try {
      if (favIds.has(roomId)) {
        await apiClient.delete(`/guest/favorites/${roomId}`);
        setFavIds((prev) => {
          const n = new Set(prev);
          n.delete(roomId);
          return n;
        });
      } else {
        await apiClient.post("/guest/favorites", { room_id: roomId });
        setFavIds((prev) => new Set(prev).add(roomId));
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="dash-page-title">Rooms at your resort</h1>
        <p className="dash-page-sub">Active listings you can book. Save favorites for quick access.</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 className="animate-spin" size={16} /> Loading rooms…
        </div>
      ) : rooms.length === 0 ? (
        <DashCard className="p-8 text-center text-zinc-500">No active rooms are available right now.</DashCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <DashCard key={room.id} className="flex flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-dash text-base font-semibold text-navy">{room.name}</h2>
                  <p className="text-xs text-zinc-500">{room.code}</p>
                </div>
                <button
                  type="button"
                  aria-label={favIds.has(room.id) ? "Remove from favorites" : "Add to favorites"}
                  className="rounded-lg border border-softBorder p-2 text-rose-500 transition hover:bg-rose-50"
                  disabled={busyId === room.id}
                  onClick={() => void toggleFav(room.id)}
                >
                  {busyId === room.id ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <Heart size={16} className={favIds.has(room.id) ? "fill-current" : ""} />
                  )}
                </button>
              </div>
              <p className="mt-2 text-sm text-zinc-600">Up to {room.capacity} guests</p>
              <p className="mt-1 text-sm font-semibold text-emerald-700">From ₱{Number(room.basePrice).toLocaleString()}</p>
              <p className="text-xs text-zinc-500">Reservation fee ₱{Number(room.reservationFee).toLocaleString()}</p>
              <Link
                href={slug ? `/resort/${encodeURIComponent(slug)}` : "/"}
                className="mt-auto pt-4 text-xs font-semibold text-clOcean hover:underline"
              >
                Open resort landing →
              </Link>
            </DashCard>
          ))}
        </div>
      )}
    </div>
  );
}
