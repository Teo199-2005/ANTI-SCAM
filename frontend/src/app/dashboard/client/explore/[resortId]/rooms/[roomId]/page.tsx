"use client";

import { checkRoomAvailability, getPublicRoom, RoomDetail } from "@/lib/api/public";
import { laravelPublicUrl } from "@/lib/publicAsset";
import { CalendarRange, ChevronLeft, ChevronRight, ExternalLink, Loader2, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useMemo, useState } from "react";

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function isoFromYmd(y: number, m: number, d: number): string {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

function addDays(iso: string, days: number): string {
  const dt = new Date(iso + "T12:00:00");
  dt.setDate(dt.getDate() + days);
  return dt.toISOString().slice(0, 10);
}

function nightsBetween(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const a = new Date(checkIn + "T12:00:00").getTime();
  const b = new Date(checkOut + "T12:00:00").getTime();
  return Math.max(0, Math.round((b - a) / 86400000));
}

function MonthCalendar({
  monthYm,
  onPrev,
  onNext,
  checkIn,
  checkOut,
  today,
  onPickDay,
}: {
  monthYm: string;
  onPrev: () => void;
  onNext: () => void;
  checkIn: string;
  checkOut: string;
  today: string;
  onPickDay: (iso: string) => void;
}) {
  const [y, m] = monthYm.split("-").map(Number);
  const title = new Date(y, m - 1, 15).toLocaleString(undefined, { month: "long", year: "numeric" });
  const firstDow = new Date(y, m - 1, 1).getDay();
  const dim = new Date(y, m, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push(d);
  const weekLabels = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  return (
    <div className="rounded-xl border border-softBorder bg-softCard p-3 shadow-soft-sm">
      <div className="mb-2 flex items-center justify-between">
        <button type="button" onClick={onPrev} className="rounded-lg p-1.5 hover:bg-softGray" aria-label="Previous month">
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-semibold text-navy">{title}</span>
        <button type="button" onClick={onNext} className="rounded-lg p-1.5 hover:bg-softGray" aria-label="Next month">
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-semibold uppercase text-zinc-400">
        {weekLabels.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-0.5">
        {cells.map((d, idx) => {
          if (d === null) {
            return <div key={`e-${idx}`} className="aspect-square" />;
          }
          const iso = isoFromYmd(y, m, d);
          const past = iso < today;
          const inRange =
            Boolean(checkIn && checkOut && iso >= checkIn && iso <= checkOut) ||
            iso === checkIn ||
            iso === checkOut;
          const isEnds = iso === checkIn || iso === checkOut;
          return (
            <button
              key={iso}
              type="button"
              disabled={past}
              onClick={() => onPickDay(iso)}
              className={`aspect-square rounded-lg text-sm font-medium transition ${
                past
                  ? "cursor-not-allowed text-zinc-300"
                  : inRange
                    ? isEnds
                      ? "bg-navy text-white"
                      : "bg-softGray text-navy"
                    : "text-zinc-700 hover:bg-softGray"
              }`}
            >
              {d}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[10px] text-zinc-400">Tap check-in date, then check-out. Past dates are disabled.</p>
    </div>
  );
}

export default function ClientRoomExplorePage({
  params,
}: {
  params: Promise<{ resortId: string; roomId: string }>;
}) {
  const { resortId, roomId } = use(params);
  const router = useRouter();
  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [checkMsg, setCheckMsg] = useState<string | null>(null);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [viewMonth, setViewMonth] = useState(() => today.slice(0, 7));

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getPublicRoom(Number(roomId));
        if (Number(resortId) !== data.resort.id) {
          router.replace(`/dashboard/client/explore/${data.resort.id}/rooms/${roomId}`);
          return;
        }
        setRoom(data);
      } catch (err) {
        setError("Room not found.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [resortId, roomId, router]);

  useEffect(() => {
    setAvailable(null);
    setCheckMsg(null);
  }, [checkIn, checkOut]);

  useEffect(() => {
    if (checkIn.length >= 7) {
      setViewMonth(checkIn.slice(0, 7));
    }
  }, [checkIn]);

  const onPickDay = (iso: string) => {
    if (iso < today) return;
    if (!checkIn || (checkIn && checkOut)) {
      setCheckIn(iso);
      setCheckOut("");
      return;
    }
    if (iso <= checkIn) {
      setCheckIn(iso);
      setCheckOut("");
      return;
    }
    setCheckOut(iso);
  };

  const shiftMonth = (delta: number) => {
    const [vy, vm] = viewMonth.split("-").map(Number);
    const dt = new Date(vy, vm - 1 + delta, 1);
    setViewMonth(`${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}`);
  };

  const nights = nightsBetween(checkIn, checkOut);
  const estimatedTotal = room && nights > 0 ? nights * Number(room.basePrice) : 0;

  const onCheckAvailability = async () => {
    if (!checkIn || !checkOut) {
      setCheckMsg("Select check-in and check-out dates.");
      return;
    }
    if (checkOut <= checkIn) {
      setCheckMsg("Check-out must be after check-in.");
      return;
    }
    setChecking(true);
    setCheckMsg(null);
    try {
      const result = await checkRoomAvailability(Number(roomId), checkIn, checkOut);
      setAvailable(result.available);
      setCheckMsg(
        result.available ? "These dates are available. You can continue to checkout." : "Sorry — not available for these dates."
      );
    } catch (err) {
      setAvailable(false);
      setCheckMsg("Could not verify availability. Try other dates.");
    } finally {
      setChecking(false);
    }
  };

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
  const checkoutHref = `/resorts/${resortId}/checkout?roomId=${roomId}&checkIn=${encodeURIComponent(checkIn)}&checkOut=${encodeURIComponent(checkOut)}`;
  const publicRoomHref = `/resorts/${resortId}/rooms/${roomId}?checkIn=${encodeURIComponent(checkIn)}&checkOut=${encodeURIComponent(checkOut)}`;

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
              <img src={laravelPublicUrl(images[0].url)} alt={images[0].caption ?? room.name} className="h-72 w-full rounded-2xl object-cover" />
              {images.length > 1 ? (
                <div className="flex flex-wrap gap-2">
                  {images.slice(1, 7).map((img) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={img.id} src={laravelPublicUrl(img.url)} alt={img.caption ?? room.name} className="h-20 w-28 rounded-lg object-cover" />
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <div className="flex h-72 items-center justify-center rounded-2xl bg-softGray text-zinc-400">No photos yet</div>
          )}

          <div className="dash-card p-5">
            <h2 className="font-dash text-base font-semibold text-navy">Pick dates</h2>
            <p className="mt-1 text-xs text-zinc-500">Calendar stays in sync with the fields on the right.</p>
            <div className="mt-4 max-w-md">
              <MonthCalendar
                monthYm={viewMonth}
                onPrev={() => shiftMonth(-1)}
                onNext={() => shiftMonth(1)}
                checkIn={checkIn}
                checkOut={checkOut}
                today={today}
                onPickDay={onPickDay}
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
            <p className="mt-3 font-dash text-2xl font-bold text-navy">₱{Number(room.basePrice).toLocaleString()}</p>
            <p className="text-xs text-zinc-500">per night (estimate before fees &amp; taxes)</p>

            <div className="mt-5 space-y-3 border-t border-softBorder pt-4">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400">
                <CalendarRange size={14} />
                Your dates
              </p>
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-600">Check-in</label>
                <input
                  type="date"
                  min={today}
                  className="dash-input w-full"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-600">Check-out</label>
                <input
                  type="date"
                  min={checkIn ? addDays(checkIn, 1) : today}
                  className="dash-input w-full"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                />
              </div>
              {nights > 0 ? (
                <p className="text-sm text-zinc-700">
                  <span className="font-semibold">{nights}</span> night{nights === 1 ? "" : "s"} · Est.{" "}
                  <span className="font-semibold text-navy">₱{estimatedTotal.toLocaleString()}</span>
                </p>
              ) : null}

              <button type="button" disabled={checking} onClick={() => void onCheckAvailability()} className="dash-btn-sm w-full justify-center gap-2">
                {checking ? <Loader2 size={14} className="animate-spin" /> : null}
                Check availability
              </button>

              {checkMsg ? (
                <p className={`text-sm ${available === true ? "text-emerald-700" : available === false ? "text-rose-700" : "text-zinc-600"}`}>
                  {checkMsg}
                </p>
              ) : null}

              <Link
                href={checkoutHref}
                className={`dash-btn-primary flex w-full justify-center ${!checkIn || !checkOut || available !== true ? "pointer-events-none opacity-50" : ""}`}
              >
                Continue to checkout →
              </Link>
              <Link
                href={publicRoomHref}
                className={`dash-btn-sm flex w-full items-center justify-center gap-2 ${!checkIn || !checkOut || available !== true ? "pointer-events-none opacity-50" : ""}`}
              >
                <ExternalLink size={14} /> Open public room page
              </Link>
              <p className="text-[10px] text-zinc-400">You’ll confirm guests and pay on the next step.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
