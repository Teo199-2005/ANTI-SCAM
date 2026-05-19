"use client";

import { checkRoomAvailability, getPublicResort, PublicRoom, PublicResort } from "@/lib/api/public";
import { laravelPublicUrl } from "@/lib/publicAsset";
import { BedDouble, CalendarRange, ChevronLeft, Loader2, MapPin, Phone, Users } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { formatGuestDisplayPerNight } from "@/lib/guestRoomPricing";

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function InlineAvailabilityPanel({ roomId, resortId }: { roomId: number; resortId: number }) {
  const today = new Date().toISOString().slice(0, 10);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [checking, setChecking] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState<boolean | null>(null);

  const onCheck = async () => {
    if (!checkIn || !checkOut) {
      setMsg("Select both dates.");
      return;
    }
    if (checkOut <= checkIn) {
      setMsg("Check-out must be after check-in.");
      return;
    }
    setChecking(true);
    setMsg(null);
    try {
      const r = await checkRoomAvailability(roomId, checkIn, checkOut);
      setOk(r.available);
      setMsg(r.available ? "Available for these dates." : "Not available — try other dates.");
    } catch (err) {
      setOk(false);
      setMsg("Could not check availability.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="mt-3 rounded-xl border border-softBorder bg-softGray/40 p-3">
      <p className="mb-2 flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-zinc-500">
        <CalendarRange size={12} /> Quick check
      </p>
      <div className="flex flex-wrap gap-2">
        <input
          type="date"
          min={today}
          className="dash-input min-w-[140px] flex-1 text-sm"
          value={checkIn}
          onChange={(e) => {
            setCheckIn(e.target.value);
            setOk(null);
            setMsg(null);
          }}
        />
        <input
          type="date"
          min={checkIn ? addDays(checkIn, 1) : today}
          className="dash-input min-w-[140px] flex-1 text-sm"
          value={checkOut}
          onChange={(e) => {
            setCheckOut(e.target.value);
            setOk(null);
            setMsg(null);
          }}
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" disabled={checking} onClick={() => void onCheck()} className="dash-btn-sm">
          {checking ? <Loader2 size={12} className="animate-spin" /> : null}
          Check
        </button>
        <Link
          href={`/dashboard/client/explore/${resortId}/rooms/${roomId}`}
          className="dash-btn-neutral-strong"
        >
          Full calendar &amp; book
        </Link>
      </div>
      {msg ? (
        <p className={`mt-2 text-xs ${ok === true ? "text-emerald-700" : ok === false ? "text-rose-700" : "text-zinc-600"}`}>{msg}</p>
      ) : null}
    </div>
  );
}

export default function ResortExplorePage() {
  const { resortId: resortIdParam } = useParams();
  const resortId = String(resortIdParam ?? "");
  const [resort, setResort] = useState<PublicResort | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRoomId, setExpandedRoomId] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getPublicResort(Number(resortId));
        setResort(data);
      } catch (err) {
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
                    onClick={() => setExpandedRoomId((id) => (id === room.id ? null : room.id))}
                    className="dash-btn-sm w-full justify-center"
                  >
                    {expandedRoomId === room.id ? "Hide availability" : "Check availability"}
                  </button>
                  {expandedRoomId === room.id ? <InlineAvailabilityPanel roomId={room.id} resortId={rid} /> : null}
                  <Link href={`/dashboard/client/explore/${rid}/rooms/${room.id}`} className="dash-btn-primary w-full justify-center text-center">
                    View &amp; book →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
