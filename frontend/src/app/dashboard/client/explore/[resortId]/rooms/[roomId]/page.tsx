"use client";

import { RoomAvailabilityBookingPanel } from "@/components/booking/RoomAvailabilityBookingPanel";
import { getPublicRoom, RoomDetail } from "@/lib/api/public";
import { laravelPublicUrl } from "@/lib/publicAsset";
import { ChevronLeft, Users } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  formatGuestDisplayPhp,
  guestBalanceAtResortPhp,
  resolveGuestReservationFeePhp,
} from "@/lib/guestRoomPricing";
import { formatPhp } from "@/lib/formatPhp";

function nightsBetween(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const a = new Date(checkIn + "T12:00:00").getTime();
  const b = new Date(checkOut + "T12:00:00").getTime();
  return Math.max(0, Math.round((b - a) / 86400000));
}

export default function ClientRoomExplorePage() {
  const { resortId: resortIdParam, roomId: roomIdParam } = useParams();
  const resortId = String(resortIdParam ?? "");
  const roomId = String(roomIdParam ?? "");
  const router = useRouter();
  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [datesValid, setDatesValid] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getPublicRoom(Number(roomId));
        if (Number(resortId) !== data.resort.id) {
          router.replace(`/dashboard/client/explore/${data.resort.id}/rooms/${roomId}`);
          return;
        }
        setRoom(data);
      } catch {
        setError("Room not found.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [resortId, roomId, router]);

  const handleDatesChange = useCallback((inDate: string, outDate: string, valid: boolean) => {
    setCheckIn(inDate);
    setCheckOut(outDate);
    setDatesValid(valid);
  }, []);

  if (loading) {
    return <div className="dash-card p-10 text-center text-zinc-600">Loading room…</div>;
  }

  if (error || !room) {
    return (
      <div className="dash-card border-rose-200 bg-rose-50 p-10 text-center text-rose-800">
        {error ?? "Not found."}
        <div className="mt-4">
          <Link href={`/dashboard/client/explore/${resortId}`} className="dash-btn-sm">
            Back to resort
          </Link>
        </div>
      </div>
    );
  }

  const images = room.images ?? [];
  const nights = nightsBetween(checkIn, checkOut);
  const reservationFeePhp = resolveGuestReservationFeePhp(room.reservationFee);
  const balanceAtResort = nights > 0 ? guestBalanceAtResortPhp(room.basePrice, nights) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/dashboard/client/explore/${resortId}`} className="dash-btn-sm">
          <ChevronLeft size={14} />
          {room.resort.name}
        </Link>
        <h1 className="dash-page-title">{room.name}</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {images.length > 0 ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={laravelPublicUrl(images[0].url)}
                alt={images[0].caption ?? room.name}
                className="h-72 w-full rounded-2xl object-cover"
              />
              {images.length > 1 ? (
                <div className="flex flex-wrap gap-2">
                  {images.slice(1, 7).map((img) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={img.id}
                      src={laravelPublicUrl(img.url)}
                      alt={img.caption ?? room.name}
                      className="h-20 w-28 rounded-lg object-cover"
                    />
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <div className="flex h-72 items-center justify-center rounded-2xl bg-softGray text-zinc-400">No photos yet</div>
          )}

          <div className="dash-card p-5">
            <h2 className="font-dash text-base font-semibold text-navy">Choose your dates</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Tap available dates on the calendar, then continue to booking when your stay is selected.
            </p>
            <div className="mt-4">
              <RoomAvailabilityBookingPanel
                roomId={Number(roomId)}
                roomName={room.name}
                resortId={Number(resortId)}
                active
                variant="dashboard"
                onDatesChange={handleDatesChange}
              />
            </div>
          </div>

          <div className="dash-card p-5">
            <h2 className="font-dash text-base font-semibold text-navy">Amenities</h2>
            {room.amenities?.length ? (
              <ul className="mt-2 list-inside list-disc text-sm text-zinc-600">
                {room.amenities.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-zinc-500">No amenities listed.</p>
            )}
            {room.rules ? (
              <>
                <h3 className="mt-4 font-semibold text-navy">House rules</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-600">{room.rules}</p>
              </>
            ) : null}
          </div>
        </div>

        <div className="space-y-4">
          <div className="dash-card p-5">
            <p className="text-sm text-zinc-600">{room.resort.name}</p>
            <p className="mt-2 flex items-center gap-2 text-sm text-zinc-600">
              <Users size={16} />
              Up to {room.capacity} guests
            </p>
            <p className="mt-3 font-dash text-2xl font-bold text-navy">
              {formatGuestDisplayPhp(room.basePrice, reservationFeePhp)}
            </p>
            <p className="text-xs text-zinc-500">per night (reservation fee included in rate shown)</p>

            {datesValid && nights > 0 ? (
              <div className="mt-5 space-y-2 border-t border-softBorder pt-4 text-sm text-zinc-700">
                <p>
                  <span className="font-semibold">{nights}</span> night{nights === 1 ? "" : "s"} ·{" "}
                  <span className="font-semibold text-navy">{formatPhp(balanceAtResort)}</span> at resort +{" "}
                  <span className="font-semibold text-navy">{formatPhp(reservationFeePhp)}</span> online
                </p>
                <p className="text-xs text-zinc-500">
                  Use <strong>Continue to booking</strong> on the calendar when you are ready.
                </p>
              </div>
            ) : (
              <p className="mt-5 border-t border-softBorder pt-4 text-xs text-zinc-500">
                Select check-in and check-out on the calendar to see your estimated total.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
