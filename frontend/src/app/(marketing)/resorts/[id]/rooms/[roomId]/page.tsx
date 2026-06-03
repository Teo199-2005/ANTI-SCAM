"use client";

import { RoomAvailabilityBookingPanel } from "@/components/booking/RoomAvailabilityBookingPanel";
import { ReservationFeeBreakdownPanel } from "@/components/booking/ReservationFeeBreakdownPanel";
import PageContainer from "@/components/layout/PageContainer";
import { getPublicRoom, RoomDetail } from "@/lib/api/public";
import { BedDouble, CalendarDays, ChevronRight, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { formatPhp } from "@/lib/formatPhp";
import {
  formatGuestDisplayPhp,
  guestBalanceAtResortPhp,
  resolveGuestReservationFeePhp,
} from "@/lib/guestRoomPricing";
import { defaultReservationFeeFallbackPhp } from "@/lib/pricingPilot";

function RoomDetailInner() {
  const { id: resortIdParam, roomId: roomIdParam } = useParams();
  const resortId = String(resortIdParam ?? "");
  const roomId = String(roomIdParam ?? "");
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
        setRoom(data);
      } catch {
        setError("Room not found or not available.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [roomId]);

  const handleDatesChange = useCallback((inDate: string, outDate: string, valid: boolean) => {
    setCheckIn(inDate);
    setCheckOut(outDate);
    setDatesValid(valid);
  }, []);

  const nights =
    datesValid && checkIn && checkOut
      ? Math.max(0, (new Date(checkOut + "T12:00:00").getTime() - new Date(checkIn + "T12:00:00").getTime()) / 86400000)
      : 0;

  if (loading) {
    return (
      <PageContainer className="section-padding">
        <div className="soft-panel p-10 text-center text-zinc-600">Loading room…</div>
      </PageContainer>
    );
  }

  if (error || !room) {
    return (
      <PageContainer className="section-padding">
        <div className="soft-panel p-10 text-center text-red-700">{error ?? "Room not found."}</div>
      </PageContainer>
    );
  }

  const reservationFeePhp = resolveGuestReservationFeePhp(room.reservationFee ?? defaultReservationFeeFallbackPhp());

  return (
    <PageContainer className="section-padding">
      <nav className="mb-4 flex items-center gap-1.5 text-sm text-zinc-500">
        <Link href="/resorts" className="hover:text-zinc-800">
          Resorts
        </Link>
        <ChevronRight size={14} />
        <Link href={`/resorts/${resortId}`} className="hover:text-zinc-800">
          {room.resort.name}
        </Link>
        <ChevronRight size={14} />
        <span className="text-zinc-900">{room.name}</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-5">
          <div className="soft-panel p-5 sm:p-7">
            <div className="flex flex-wrap items-start gap-3">
              <h1 className="flex-1 font-heading text-2xl font-bold text-zinc-900 sm:text-4xl">{room.name}</h1>
              <span className="glass-tag text-sm">{room.code}</span>
            </div>

            <div className="mt-4 flex flex-wrap gap-4 text-sm text-zinc-600">
              <span className="inline-flex items-center gap-1.5">
                <Users size={14} />
                Up to {room.capacity} guests
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={14} />
                {room.resort.address ?? room.resort.name}
              </span>
            </div>

            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Price per night</p>
              <p className="font-heading text-2xl font-bold text-zinc-900 sm:text-4xl">
                {formatGuestDisplayPhp(room.basePrice, reservationFeePhp)}
              </p>
              <p className="text-xs text-zinc-500">
                Includes {formatPhp(reservationFeePhp)} reservation fee in the rate shown; pay the room balance at check-in.
              </p>
            </div>
          </div>

          {room.amenities.length > 0 ? (
            <div className="soft-panel p-6">
              <h2 className="font-heading text-2xl text-zinc-900">
                <BedDouble size={18} className="mr-2 inline" />
                Amenities
              </h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {room.amenities.map((a) => (
                  <span key={a} className="glass-tag">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {room.rules ? (
            <div className="soft-panel p-6">
              <h2 className="font-heading text-2xl text-zinc-900">House Rules</h2>
              <p className="mt-3 whitespace-pre-line text-sm text-zinc-600">{room.rules}</p>
            </div>
          ) : null}

          <div className="soft-panel p-6">
            <h2 className="font-heading text-2xl text-zinc-900">About {room.resort.name}</h2>
            {room.resort.description ? (
              <p className="mt-3 text-sm text-zinc-600">{room.resort.description}</p>
            ) : null}
            <Link href={`/resorts/${resortId}`} className="glass-inline-btn mt-4">
              View all rooms
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          <div className="soft-panel p-6">
            <h2 className="mb-4 font-heading text-2xl text-zinc-900">
              <CalendarDays size={18} className="mr-2 inline" />
              Choose your dates
            </h2>
            <p className="mb-4 text-sm text-zinc-600">
              Tap available dates on the calendar, then continue to booking when your stay is selected.
            </p>
            <RoomAvailabilityBookingPanel
              roomId={Number(roomId)}
              roomName={room.name}
              resortId={Number(resortId)}
              active
              variant="marketing"
              onDatesChange={handleDatesChange}
            />

            {nights > 0 ? (
              <div className="mt-5 rounded-xl border border-white/40 bg-white/30 p-4 backdrop-blur-md">
                <h3 className="mb-3 text-sm font-semibold text-zinc-800">Price Summary</h3>
                <div className="space-y-1.5 text-sm text-zinc-700">
                  <div className="flex justify-between">
                    <span>
                      {formatPhp(Number(room.basePrice))} × {nights} night{nights > 1 ? "s" : ""}
                    </span>
                    <span>{formatPhp(guestBalanceAtResortPhp(room.basePrice, nights))}</span>
                  </div>
                  <div className="flex justify-between text-amber-700">
                    <span>Reservation fee (now)</span>
                    <span>{formatPhp(reservationFeePhp)}</span>
                  </div>
                  <div className="flex justify-between border-t border-zinc-200 pt-2 font-semibold text-zinc-900">
                    <span>Balance at resort</span>
                    <span>{formatPhp(guestBalanceAtResortPhp(room.basePrice, nights))}</span>
                  </div>
                </div>
                <ReservationFeeBreakdownPanel totalPhp={reservationFeePhp} variant="compact" className="mt-3" />
              </div>
            ) : null}
          </div>

          <div className="soft-panel p-5 text-sm text-zinc-600">
            <p className="font-semibold text-zinc-800">Need help?</p>
            <p className="mt-1">{room.resort.name}</p>
            {room.resort.address ? <p>{room.resort.address}</p> : null}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

export default function RoomDetailPage() {
  return (
    <Suspense
      fallback={
        <PageContainer className="section-padding">
          <div className="soft-panel p-10 text-center text-zinc-600">Loading room…</div>
        </PageContainer>
      }
    >
      <RoomDetailInner />
    </Suspense>
  );
}
