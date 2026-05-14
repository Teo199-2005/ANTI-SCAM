"use client";

import { checkRoomAvailability } from "@/lib/api/public";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";
import { ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function isoFromYmd(y: number, m: number, d: number): string {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

function addDaysIso(iso: string, days: number): string {
  const dt = new Date(iso + "T12:00:00");
  dt.setDate(dt.getDate() + days);
  return dt.toISOString().slice(0, 10);
}

function todayIsoLocal(): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

type DayState = "past" | "loading" | "free" | "busy" | "unknown";

type Props = {
  open: boolean;
  onClose: () => void;
  roomId: number;
  roomName: string;
  /** Dates selected in the parent room modal (checked with “Check full stay for these dates”). */
  checkIn: string;
  checkOut: string;
};

/**
 * Month heatmap using public one-night probes (start night → next day).
 * Full range is re-checked explicitly for the guest’s chosen check-in / check-out.
 */
export function ResortRoomAvailabilityModal({ open, onClose, roomId, roomName, checkIn, checkOut }: Props) {
  const todayStr = useMemo(() => todayIsoLocal(), []);
  const [mounted, setMounted] = useState(false);
  const [monthYm, setMonthYm] = useState(() => todayStr.slice(0, 7));
  const [dayMap, setDayMap] = useState<Record<string, DayState>>({});
  const [monthLoading, setMonthLoading] = useState(false);
  const [rangeChecking, setRangeChecking] = useState(false);
  const [rangeResult, setRangeResult] = useState<"idle" | "available" | "unavailable" | "error">("idle");
  const [verifyDetail, setVerifyDetail] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    if (checkIn && checkIn >= todayStr) {
      setMonthYm(checkIn.slice(0, 7));
    } else {
      setMonthYm(todayStr.slice(0, 7));
    }
    setRangeResult("idle");
    setVerifyDetail(null);
  }, [open, checkIn, todayStr]);

  const [y, m] = monthYm.split("-").map(Number);
  const dim = new Date(y, m, 0).getDate();
  const firstDow = new Date(y, m - 1, 1).getDay();
  const title = new Date(y, m - 1, 15).toLocaleString(undefined, { month: "long", year: "numeric" });

  const loadMonth = useCallback(async () => {
    setMonthLoading(true);
    const nextMap: Record<string, DayState> = {};
    const isos: string[] = [];
    for (let d = 1; d <= dim; d++) {
      const iso = isoFromYmd(y, m, d);
      if (iso < todayStr) {
        nextMap[iso] = "past";
      } else {
        nextMap[iso] = "loading";
        isos.push(iso);
      }
    }
    setDayMap(nextMap);

    const batch = 6;
    for (let i = 0; i < isos.length; i += batch) {
      const chunk = isos.slice(i, i + batch);
      await Promise.all(
        chunk.map(async (iso) => {
          const out = addDaysIso(iso, 1);
          try {
            const r = await checkRoomAvailability(roomId, iso, out);
            setDayMap((prev) => ({ ...prev, [iso]: r.available ? "free" : "busy" }));
          } catch {
            setDayMap((prev) => ({ ...prev, [iso]: "unknown" }));
          }
        }),
      );
    }
    setMonthLoading(false);
  }, [roomId, y, m, dim, todayStr]);

  useEffect(() => {
    if (!open) return;
    void loadMonth();
  }, [open, loadMonth]);

  const verifySelectedStay = async () => {
    if (!checkIn || !checkOut || checkOut <= checkIn) {
      setRangeResult("error");
      setVerifyDetail("Pick a check-out date after check-in.");
      return;
    }
    setRangeChecking(true);
    setRangeResult("idle");
    setVerifyDetail(null);
    try {
      const r = await checkRoomAvailability(roomId, checkIn, checkOut);
      setRangeResult(r.available ? "available" : "unavailable");
    } catch (err) {
      setRangeResult("error");
      setVerifyDetail(parseApiErrorMessage(err, "Could not verify availability."));
    } finally {
      setRangeChecking(false);
    }
  };

  const shiftMonth = (delta: number) => {
    const d = new Date(y, m - 1 + delta, 1);
    setMonthYm(`${d.getFullYear()}-${pad2(d.getMonth() + 1)}`);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted || !open) return null;

  const weekLabels = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push(d);

  const inSelectedRange = (iso: string) =>
    Boolean(checkIn && checkOut && iso >= checkIn && iso < checkOut);

  return createPortal(
    <div
      className="fixed inset-0 z-[240] flex items-center justify-center bg-zinc-950/75 p-3 md:p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/40 bg-white p-5 shadow-2xl md:p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="avail-modal-title"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="avail-modal-title" className="font-heading text-xl font-bold text-navy">
              Availability
            </h2>
            <p className="mt-1 text-sm text-zinc-500">{roomName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <p className="mb-3 text-xs leading-relaxed text-zinc-600">
          Colors show a quick <strong>one-night</strong> availability probe from each date (open vs blocked for that
          single night only — not the nightly rate). Confirm your <strong>full</strong> stay with the button below.
        </p>

        <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="rounded-lg p-1.5 hover:bg-white"
              aria-label="Previous month"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-semibold text-navy">{title}</span>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="rounded-lg p-1.5 hover:bg-white"
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
              <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-semibold uppercase text-zinc-400">
                {weekLabels.map((w) => (
                  <div key={w} className="py-1">
                    {w}
                  </div>
                ))}
              </div>
              <div className="mt-1 grid grid-cols-7 gap-0.5">
                {cells.map((d, idx) => {
                  if (d === null) return <div key={`e-${idx}`} className="aspect-square" />;
                  const iso = isoFromYmd(y, m, d);
                  const st = dayMap[iso] ?? "loading";
                  const selected = inSelectedRange(iso) || iso === checkIn;
                  return (
                    <div
                      key={iso}
                      className={`flex aspect-square flex-col items-center justify-center rounded-lg text-[11px] font-semibold ${
                        st === "past"
                          ? "text-zinc-300"
                          : st === "loading"
                            ? "bg-zinc-100 text-zinc-400"
                            : st === "free"
                              ? "bg-emerald-100 text-emerald-900"
                              : st === "busy"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-amber-50 text-amber-900"
                      } ${selected && st !== "past" ? "ring-2 ring-navy ring-offset-1" : ""}`}
                      title={
                        st === "free"
                          ? "Room can start a one-night stay on this date"
                          : st === "busy"
                            ? "Room cannot start a one-night stay on this date (booked, blocked, or on hold)"
                            : st === "unknown"
                              ? "Could not verify — try changing month or reopening this calendar"
                              : ""
                      }
                    >
                      <span>{d}</span>
                      {st === "loading" ? <Loader2 size={10} className="mt-0.5 animate-spin opacity-60" /> : null}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="mt-4 rounded-xl border border-sky-200/80 bg-sky-50/50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-900">Your selected stay</p>
          <p className="mt-1 text-sm text-zinc-700">
            Check-in <strong>{checkIn || "—"}</strong> → Check-out <strong>{checkOut || "—"}</strong>
          </p>
          <button
            type="button"
            onClick={() => void verifySelectedStay()}
            disabled={rangeChecking || !checkIn || !checkOut || checkOut <= checkIn}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy/90 disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            {rangeChecking ? <Loader2 size={16} className="animate-spin" /> : null}
            Check full stay for these dates
          </button>
          {rangeResult === "available" ? (
            <p className="mt-2 text-sm font-medium text-emerald-700">These dates are available for booking.</p>
          ) : null}
          {rangeResult === "unavailable" ? (
            <p className="mt-2 text-sm font-medium text-rose-700">
              These dates are not available (booked, on hold, or blocked). Adjust your stay in the room window
              behind this dialog.
            </p>
          ) : null}
          {rangeResult === "error" ? (
            <p className="mt-2 text-sm font-medium text-amber-800">
              {verifyDetail ??
                "Pick valid check-in and check-out in the room details dialog, then try again."}
            </p>
          ) : null}
        </div>

        <div
          className="mt-3 space-y-2 rounded-lg border border-zinc-200/80 bg-white/80 p-3 text-[11px] leading-snug text-zinc-600"
          role="list"
          aria-label="Calendar color meanings"
        >
          <div className="flex gap-2" role="listitem">
            <span className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-sm bg-emerald-200" aria-hidden />
            <span>
              <span className="font-semibold text-zinc-800">Available (one-night)</span> — that night can start a
              one-night booking. This is availability only, not “free” pricing.
            </span>
          </div>
          <div className="flex gap-2" role="listitem">
            <span className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-sm bg-rose-200" aria-hidden />
            <span>
              <span className="font-semibold text-zinc-800">Not available (one-night)</span> — booked, blocked, or on
              hold for that one-night starting window.
            </span>
          </div>
          <div className="flex gap-2" role="listitem">
            <span className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-sm bg-amber-100" aria-hidden />
            <span>
              <span className="font-semibold text-zinc-800">Could not verify</span> — the one-night check failed
              (network or server). Change month or reopen this calendar to retry.
            </span>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
