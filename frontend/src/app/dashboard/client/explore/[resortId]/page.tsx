"use client";

import { ResortRoomAvailabilityModal } from "@/components/resort-page/ResortRoomAvailabilityModal";
import { getPublicResort, PublicRoom, PublicResort } from "@/lib/api/public";
import { laravelPublicUrl } from "@/lib/publicAsset";
import { BedDouble, ChevronLeft, MapPin, Phone, Users } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { formatGuestDisplayPerNight } from "@/lib/guestRoomPricing";

export default function ResortExplorePage() {
  const { resortId: resortIdParam } = useParams();
  const resortId = String(resortIdParam ?? "");
  const [resort, setResort] = useState<PublicResort | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingRoom, setBookingRoom] = useState<PublicRoom | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getPublicResort(Number(resortId));
        setResort(data);
      } catch {
        setError("Resort not found.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [resortId]);

  if (loading) {
    return <div className="dash-card p-10 text-center text-zinc-600">Loading resort…</div>;
  }

  if (error || !resort) {
    return (
      <div className="dash-card border-rose-200 bg-rose-50 p-10 text-center text-rose-800">
        {error ?? "Not found."}
        <div className="mt-4">
          <Link href="/dashboard/client/explore" className="dash-btn-sm">
            Back to explore
          </Link>
        </div>
      </div>
    );
  }

  const rooms: PublicRoom[] = resort.rooms ?? [];
  const rid = Number(resortId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/dashboard/client/explore" className="dash-btn-sm">
          <ChevronLeft size={14} />
          Explore
        </Link>
        <h1 className="dash-page-title">{resort.name}</h1>
      </div>

      <div className="dash-card p-6">
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="shrink-0">
            {resort.images && resort.images.length > 0 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={laravelPublicUrl(resort.images[0].url)}
                alt={resort.images[0].caption ?? resort.name}
                className="h-48 w-full max-w-md rounded-xl object-cover md:h-40 md:w-72"
              />
            ) : (
              <div className="flex h-48 w-full max-w-md items-center justify-center rounded-xl bg-softGray md:h-40 md:w-72">
                <BedDouble className="text-zinc-300" size={48} />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            {resort.address ? (
              <p className="flex items-start gap-2 text-sm text-zinc-600">
                <MapPin size={16} className="mt-0.5 shrink-0" />
                {resort.address}
              </p>
            ) : null}
            {resort.contactNumber ? (
              <p className="mt-2 flex items-center gap-2 text-sm text-zinc-600">
                <Phone size={16} className="shrink-0" />
                {resort.contactNumber}
              </p>
            ) : null}
            {resort.description ? <p className="mt-4 text-sm leading-relaxed text-zinc-700">{resort.description}</p> : null}
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-4 font-dash text-lg font-semibold text-navy">Rooms</h2>
        {rooms.length === 0 ? (
          <p className="text-sm text-zinc-500">No active rooms listed for this resort.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => (
              <div key={room.id} className="dash-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-navy">{room.name}</h3>
                  <span className="dash-badge-emerald shrink-0">{room.status}</span>
                </div>
                <p className="mt-1 flex items-center gap-1 text-sm text-zinc-600">
                  <Users size={14} /> Up to {room.capacity} guests
                </p>
                <p className="mt-2 text-sm font-semibold text-navy">From {formatGuestDisplayPerNight(room.basePrice, room.reservationFee)}</p>
                {room.units && room.units > 1 ? (
                  <p className="mt-0.5 text-xs text-zinc-500">{room.units} bookable units (same room type)</p>
                ) : null}
                {room.amenities?.length ? (
                  <p className="mt-2 line-clamp-2 text-xs text-zinc-500">{room.amenities.slice(0, 4).join(" · ")}</p>
                ) : null}
                <div className="mt-3 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setBookingRoom(room)}
                    className="dash-btn-primary w-full justify-center"
                  >
                    Book now
                  </button>
                  <Link
                    href={`/dashboard/client/explore/${rid}/rooms/${room.id}`}
                    className="dash-btn-neutral-strong w-full justify-center text-center"
                  >
                    View room details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {bookingRoom ? (
        <ResortRoomAvailabilityModal
          open
          onClose={() => setBookingRoom(null)}
          roomId={bookingRoom.id}
          roomName={bookingRoom.name}
          resortId={rid}
          variant="dashboard"
        />
      ) : null}
    </div>
  );
}
