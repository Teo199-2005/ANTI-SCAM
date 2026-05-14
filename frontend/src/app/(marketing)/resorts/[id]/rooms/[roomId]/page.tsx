"use client";

import PageContainer from "@/components/layout/PageContainer";
import { checkRoomAvailability, getPublicRoom, RoomDetail } from "@/lib/api/public";
import {
  BadgeCheck,
  BedDouble,
  CalendarDays,
  ChevronRight,
  Loader2,
  MapPin,
  Users,
  XCircle,
} from "lucide-react";
import { ReservationFeeBreakdownPanel } from "@/components/booking/ReservationFeeBreakdownPanel";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function RoomDetailInner() {
  const { id: resortIdParam, roomId: roomIdParam } = useParams();
  const resortId = String(resortIdParam ?? "");
  const roomId = String(roomIdParam ?? "");
  const searchParams = useSearchParams();
  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [checking, setChecking] = useState(false);
  const [availability, setAvailability] = useState<boolean | null>(null);
  const [availMsg, setAvailMsg] = useState("");

  const today = new Date().toISOString().split("T")[0];

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

  useEffect(() => {
    const inP = searchParams.get("checkIn");
    const outP = searchParams.get("checkOut");
    if (!inP || inP < today) {
      return;
    }
    setCheckIn(inP);
    if (outP && outP > inP) {
      setCheckOut(outP);
    } else {
      setCheckOut("");
    }
  }, [searchParams, today]);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setChecking(true);
    setAvailability(null);
    setAvailMsg("");
    try {
      const result = await checkRoomAvailability(Number(roomId), checkIn, checkOut);
      setAvailability(result.available);
      setAvailMsg(result.available ? "Room is available for your dates!" : "Room is not available for these dates.");
    } catch {
      setAvailMsg("Could not check availability. Please try again.");
    } finally {
      setChecking(false);
    }
  };

  const nights =
    checkIn && checkOut
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

  const checkoutHref = `/resorts/${resortId}/checkout?roomId=${roomId}&checkIn=${checkIn}&checkOut=${checkOut}&resortId=${resortId}`;
  const checkOutMin = checkIn ? addDays(checkIn, 1) : today;
  const reservationFeePhp = Number(room.reservationFee ?? 500);

  return (
    <PageContainer className="section-padding">
      {/* Breadcrumb */}
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
        {/* Room info */}
        <div className="space-y-5">
          <div className="soft-panel p-7">
            <div className="flex flex-wrap items-start gap-3">
              <h1 className="flex-1 font-heading text-4xl text-zinc-900">{room.name}</h1>
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
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Base price</p>
              <p className="font-heading text-4xl text-zinc-900">₱{Number(room.basePrice).toLocaleString()}</p>
              <p className="text-xs text-zinc-500">per night (excl. reservation fee)</p>
            </div>
          </div>

          {/* Amenities */}
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

          {/* Rules */}
          {room.rules ? (
            <div className="soft-panel p-6">
              <h2 className="font-heading text-2xl text-zinc-900">House Rules</h2>
              <p className="mt-3 whitespace-pre-line text-sm text-zinc-600">{room.rules}</p>
            </div>
          ) : null}

          {/* Resort info */}
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

        {/* Availability widget */}
        <div className="space-y-4">
          <div className="soft-panel p-6">
            <h2 className="mb-4 font-heading text-2xl text-zinc-900">
              <CalendarDays size={18} className="mr-2 inline" />
              Check Availability
            </h2>
            <form onSubmit={handleCheck} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-700">Check-in date</label>
                <input
                  type="date"
                  className="glass-field"
                  min={today}
                  value={checkIn}
                  onChange={(e) => {
                    setCheckIn(e.target.value);
                    setAvailability(null);
                  }}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-700">Check-out date</label>
                <input
                  type="date"
                  className="glass-field"
                  min={checkOutMin}
                  value={checkOut}
                  onChange={(e) => {
                    setCheckOut(e.target.value);
                    setAvailability(null);
                  }}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={checking || !checkIn || !checkOut}
                className="cl-btn-primary w-full disabled:opacity-60 disabled:pointer-events-none"
              >
                {checking ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" /> Checking…
                  </span>
                ) : (
                  "Check Availability"
                )}
              </button>
            </form>

            {availMsg ? (
              <div
                className={`mt-4 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${
                  availability
                    ? "border-emerald-200 bg-emerald-50/80 text-emerald-800"
                    : "border-red-200 bg-red-50/80 text-red-800"
                }`}
              >
                {availability ? <BadgeCheck size={16} className="mt-0.5" /> : <XCircle size={16} className="mt-0.5" />}
                {availMsg}
              </div>
            ) : null}

            {/* Price summary */}
            {nights > 0 && room ? (
              <div className="mt-5 rounded-xl border border-white/40 bg-white/30 p-4 backdrop-blur-md">
                <h3 className="mb-3 text-sm font-semibold text-zinc-800">Price Summary</h3>
                <div className="space-y-1.5 text-sm text-zinc-700">
                  <div className="flex justify-between">
                    <span>
                      ₱{Number(room.basePrice).toLocaleString()} × {nights} night{nights > 1 ? "s" : ""}
                    </span>
                    <span>₱{(Number(room.basePrice) * nights).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-amber-700">
                    <span>Reservation fee (now)</span>
                    <span>
                      ₱{reservationFeePhp.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-zinc-200 pt-2 font-semibold text-zinc-900">
                    <span>Balance at resort</span>
                    <span>₱{(Number(room.basePrice) * nights).toLocaleString()}</span>
                  </div>
                </div>
                <ReservationFeeBreakdownPanel totalPhp={reservationFeePhp} variant="compact" className="mt-3" />
              </div>
            ) : null}

            {/* Book button */}
            {availability === true ? (
              <Link href={checkoutHref} className="cl-btn-primary mt-4 flex w-full justify-center">
                Proceed to Checkout →
              </Link>
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
