"use client";

import {
  checkRoomAvailability,
  fetchRoomAvailabilityCalendar,
  type AvailabilityCalendarDayState,
} from "@/lib/api/public";
import { formatStayRange } from "@/lib/formatPhp";
import { releasePendingCheckoutIfAny } from "@/lib/api/payment";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";
import { buildResortCheckoutHref, todayIsoLocal } from "@/lib/publicBookingLinks";
import { cn } from "@/lib/utils";
import { Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function isoFromYmd(y: number, m: number, d: number): string {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

function addDaysIso(iso: string, days: number): string {
  const dt = new Date(`${iso}T12:00:00`);
  dt.setDate(dt.getDate() + days);
  return dt.toISOString().slice(0, 10);
}

type DayState = "past" | "loading" | "free" | "busy" | "unknown";

async function probeMonthByDay(
  roomId: number,
  year: number,
  month: number,
  dim: number,
  todayStr: string,
): Promise<Record<string, DayState>> {
  const isos: string[] = [];
  for (let d = 1; d <= dim; d++) {
    const iso = isoFromYmd(year, month, d);
    if (iso >= todayStr) isos.push(iso);
  }
  const mapped: Record<string, DayState> = {};
  const batch = 6;
  for (let i = 0; i < isos.length; i += batch) {
    const chunk = isos.slice(i, i + batch);
    await Promise.all(
      chunk.map(async (iso) => {
        try {
          const r = await checkRoomAvailability(roomId, iso, addDaysIso(iso, 1));
          mapped[iso] = r.available ? "free" : "busy";
        } catch {
          mapped[iso] = "unknown";
        }
      }),
    );
  }
  return mapped;
}

function dayCellBaseClass(st: DayState): string {
  switch (st) {
    case "past":
      return "bg-zinc-300 text-zinc-500 cursor-not-allowed";
    case "loading":
      return "bg-zinc-400 text-zinc-100 cursor-wait";
    case "free":
      return "bg-emerald-600 text-white cursor-pointer hover:bg-emerald-700 active:bg-emerald-800";
    case "busy":
      return "bg-rose-600 text-white cursor-not-allowed";
    default:
      return "bg-amber-500 text-white cursor-not-allowed";
  }
}

export type RoomAvailabilityBookingPanelProps = {
  roomId: number;
  roomName: string;
  resortId: number;
  /** When false, calendar does not load (e.g. closed modal). */
  active?: boolean;
  variant?: "marketing" | "dashboard";
  className?: string;
  onDatesChange?: (checkIn: string, checkOut: string, valid: boolean) => void;
};

/**
 * Solid-color availability calendar + tap-to-select check-in / check-out + continue to checkout.
 */
export function RoomAvailabilityBookingPanel({
  roomId,
  roomName,
  resortId,
  active = true,
  variant = "marketing",
  className,
  onDatesChange,
}: RoomAvailabilityBookingPanelProps) {
  const router = useRouter();
  const todayStr = useMemo(() => todayIsoLocal(), []);
  const isDash = variant === "dashboard";
  const [monthYm, setMonthYm] = useState(() => todayStr.slice(0, 7));
  const [dayMap, setDayMap] = useState<Record<string, DayState>>({});
  const [monthLoading, setMonthLoading] = useState(false);
  const [selectedCheckIn, setSelectedCheckIn] = useState("");
  const [selectedCheckOut, setSelectedCheckOut] = useState("");
  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const datesValid =
    Boolean(selectedCheckIn && selectedCheckOut) &&
    selectedCheckOut > selectedCheckIn &&
    selectedCheckIn >= todayStr;

  useEffect(() => {
    onDatesChange?.(selectedCheckIn, selectedCheckOut, datesValid);
  }, [selectedCheckIn, selectedCheckOut, datesValid, onDatesChange]);

  useEffect(() => {
    if (!active) return;
    void releasePendingCheckoutIfAny();
    setMonthYm(todayStr.slice(0, 7));
    setSelectedCheckIn("");
    setSelectedCheckOut("");
    setBookingError(null);
  }, [active, todayStr, roomId]);

  const [y, m] = monthYm.split("-").map(Number);
  const dim = new Date(y, m, 0).getDate();
  const firstDow = new Date(y, m - 1, 1).getDay();
  const title = new Date(y, m - 1, 15).toLocaleString(undefined, { month: "long", year: "numeric" });

  const loadMonth = useCallback(async () => {
    setMonthLoading(true);
    const nextMap: Record<string, DayState> = {};
    for (let d = 1; d <= dim; d++) {
      const iso = isoFromYmd(y, m, d);
      nextMap[iso] = iso < todayStr ? "past" : "loading";
    }
    setDayMap(nextMap);

    try {
      const cal = await fetchRoomAvailabilityCalendar(roomId, y, m);
      const mapped: Record<string, DayState> = {};
      for (let d = 1; d <= dim; d++) {
        const iso = isoFromYmd(y, m, d);
        if (iso < todayStr) {
          mapped[iso] = "past";
          continue;
        }
        const st = cal.days[iso] as AvailabilityCalendarDayState | undefined;
        mapped[iso] =
          st === "busy" ? "busy" : st === "free" ? "free" : st === "past" ? "past" : "unknown";
      }
      setDayMap(mapped);
    } catch (err) {
      const msg = parseApiErrorMessage(err, "Could not load month calendar.");
      const probed = await probeMonthByDay(roomId, y, m, dim, todayStr);
      const mapped: Record<string, DayState> = {};
      for (let d = 1; d <= dim; d++) {
        const iso = isoFromYmd(y, m, d);
        mapped[iso] = iso < todayStr ? "past" : (probed[iso] ?? "unknown");
      }
      setDayMap(mapped);
      setBookingError(
        Object.values(probed).some((s) => s === "free" || s === "busy")
          ? `Using per-day checks (${msg}).`
          : msg,
      );
    } finally {
      setMonthLoading(false);
    }
  }, [roomId, y, m, dim, todayStr]);

  useEffect(() => {
    if (!active) return;
    void loadMonth();
  }, [active, loadMonth]);

  const handleDayClick = (iso: string, st: DayState) => {
    if (st !== "free" || iso < todayStr) return;
    setBookingError(null);

    if (!selectedCheckIn || (selectedCheckIn && selectedCheckOut)) {
      setSelectedCheckIn(iso);
      setSelectedCheckOut("");
      return;
    }

    if (iso <= selectedCheckIn) {
      setSelectedCheckIn(iso);
      setSelectedCheckOut("");
      return;
    }

    setSelectedCheckOut(iso);
  };

  const continueToBooking = async () => {
    if (!datesValid || booking) return;
    setBooking(true);
    setBookingError(null);
    try {
      const r = await checkRoomAvailability(roomId, selectedCheckIn, selectedCheckOut);
      if (!r.available) {
        setBookingError(
          "These dates are not available for the full stay (booked, on hold, or blocked). Pick different dates.",
        );
        return;
      }
      router.push(buildResortCheckoutHref(resortId, roomId, selectedCheckIn, selectedCheckOut));
    } catch (err) {
      setBookingError(parseApiErrorMessage(err, "Could not verify availability. Try again."));
    } finally {
      setBooking(false);
    }
  };

  const shiftMonth = (delta: number) => {
    const d = new Date(y, m - 1 + delta, 1);
    setMonthYm(`${d.getFullYear()}-${pad2(d.getMonth() + 1)}`);
  };

  const weekLabels = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push(d);

  const inSelectedRange = (iso: string) =>
    Boolean(selectedCheckIn && selectedCheckOut && iso >= selectedCheckIn && iso < selectedCheckOut);

  const calendarShell = isDash
    ? "rounded-xl border border-softBorder bg-softCard p-3 shadow-soft-sm"
    : "rounded-xl border border-zinc-200 bg-zinc-50 p-3";

  const summaryShell = isDash
    ? "rounded-xl border border-softBorder bg-softGray/40 p-3"
    : "rounded-xl border border-sky-300 bg-sky-50 p-3";

  const continueBtn = isDash
    ? "dash-btn-primary mt-3 inline-flex w-full items-center justify-center gap-2"
    : "mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy/90 disabled:cursor-not-allowed disabled:bg-zinc-400";

  return (
    <div className={cn(className)}>
      <p className={cn("mb-3 text-xs leading-relaxed", isDash ? "text-zinc-600" : "text-zinc-600")}>
        <span className="sr-only">{roomName}. </span>
        Tap an <strong className="text-emerald-700">available</strong> date for check-in, then a later date for
        check-out.
      </p>

      <div className={calendarShell}>
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className={cn("rounded-lg p-1.5", isDash ? "hover:bg-softGray" : "hover:bg-white")}
            aria-label="Previous month"
          >
            <ChevronLeft size={18} />
          </button>
          <span className={cn("text-sm font-semibold", isDash ? "text-navy" : "text-navy")}>{title}</span>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className={cn("rounded-lg p-1.5", isDash ? "hover:bg-softGray" : "hover:bg-white")}
            aria-label="Next month"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        {monthLoading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-zinc-500">
            <Loader2 size={18} className="animate-spin" />
            Loading calendar…
          </div>
        ) : (
          <>
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase text-zinc-500">
              {weekLabels.map((w) => (
                <div key={w} className="py-1">
                  {w}
                </div>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {cells.map((d, idx) => {
                if (d === null) return <div key={`e-${idx}`} className="aspect-square" />;
                const iso = isoFromYmd(y, m, d);
                const st = dayMap[iso] ?? "loading";
                const isCheckIn = iso === selectedCheckIn;
                const isCheckOut = iso === selectedCheckOut;
                const inRange = inSelectedRange(iso);
                const isEndpoint = isCheckIn || isCheckOut;
                const clickable = st === "free" && iso >= todayStr;

                return (
                  <button
                    key={iso}
                    type="button"
                    disabled={!clickable}
                    onClick={() => handleDayClick(iso, st)}
                    className={cn(
                      "relative flex aspect-square flex-col items-center justify-center rounded-lg text-[11px] font-bold transition",
                      dayCellBaseClass(st),
                      inRange && st === "free" && "bg-emerald-700",
                      isEndpoint && st === "free" && "ring-2 ring-navy ring-offset-1",
                    )}
                  >
                    <span>{d}</span>
                    {isEndpoint && st === "free" ? (
                      <Check size={11} className="mt-0.5" strokeWidth={3} aria-hidden />
                    ) : null}
                    {st === "loading" ? <Loader2 size={10} className="mt-0.5 animate-spin" /> : null}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className={cn("mt-4", summaryShell)}>
        <p className={cn("text-xs font-semibold uppercase tracking-wide", isDash ? "text-zinc-500" : "text-sky-900")}>
          Selected stay
        </p>
        <p className="mt-1 text-sm text-zinc-800">
          {selectedCheckIn && !selectedCheckOut ? (
            <>
              Check-in <strong>{selectedCheckIn}</strong> — tap check-out date
            </>
          ) : datesValid ? (
            <strong>{formatStayRange(selectedCheckIn, selectedCheckOut)}</strong>
          ) : (
            <span className="text-zinc-500">No dates selected yet</span>
          )}
        </p>
        <button
          type="button"
          onClick={() => void continueToBooking()}
          disabled={booking || !datesValid}
          className={continueBtn}
        >
          {booking ? <Loader2 size={16} className="animate-spin" /> : null}
          Continue to booking
        </button>
        {bookingError ? <p className="mt-2 text-sm font-medium text-rose-700">{bookingError}</p> : null}
      </div>

      <div
        className={cn(
          "mt-3 space-y-2 rounded-lg border p-3 text-[11px] leading-snug text-zinc-600",
          isDash ? "border-softBorder bg-white" : "border-zinc-200 bg-white",
        )}
        role="list"
        aria-label="Calendar color meanings"
      >
        <div className="flex items-center gap-2" role="listitem">
          <span className="h-4 w-4 shrink-0 rounded-md bg-emerald-600" aria-hidden />
          <span>
            <span className="font-semibold text-zinc-800">Available</span> — tap to select
          </span>
        </div>
        <div className="flex items-center gap-2" role="listitem">
          <span className="h-4 w-4 shrink-0 rounded-md bg-rose-600" aria-hidden />
          <span>
            <span className="font-semibold text-zinc-800">Not available</span> — booked, blocked, or on hold
          </span>
        </div>
        <div className="flex items-center gap-2" role="listitem">
          <span className="h-4 w-4 shrink-0 rounded-md bg-amber-500" aria-hidden />
          <span>
            <span className="font-semibold text-zinc-800">Unknown</span> — try another month
          </span>
        </div>
      </div>
    </div>
  );
}
