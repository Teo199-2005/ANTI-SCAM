"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { verifyRoomAvailability, lockRoom, submitReservation } from "@/lib/booking/bookingService";
import { CalendarDays, CreditCard, DoorOpen, MessageSquareWarning } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { sanitizeNumericIdInput } from "@/lib/inputRestrictions";

const fieldClass =
  "w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 pl-10 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-clOcean focus:ring-2 focus:ring-clOcean/15";

export default function BookingEngine() {
  const { user } = useAuth();
  /** Avoid hydrating <input> nodes: extensions often inject attrs (e.g. fdprocessedid) before React runs. */
  const [formReady, setFormReady] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFormReady(true);
  }, []);

  const onReserve = async () => {
    if (!user) {
      setMessage("Sign in to complete a protected reservation on Anti-Scam PH.");
      return;
    }
    try {
      setLoading(true);
      setMessage("");
      const availability = await verifyRoomAvailability(Number(roomId), checkIn, checkOut);
      if (!availability?.available) {
        setMessage("This room isn’t available for those dates — try other dates or a verified listing to avoid scam offers.");
        return;
      }
      const lock = await lockRoom({
        room_id: Number(roomId),
        check_in_date: checkIn,
        check_out_date: checkOut,
      });
      await submitReservation({
        room_id: Number(roomId),
        booking_lock_id: lock?.id,
        check_in_date: checkIn,
        check_out_date: checkOut,
      });
      setMessage("Reservation submitted — continue to secure payment confirmation.");
    } catch {
      setMessage("Could not complete this step. Check your connection and try again, or contact Anti-Scam PH support.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6">
      <div className="rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-[0_20px_44px_-20px_rgba(13,30,66,0.14)] md:p-8">
        {formReady ? (
          <>
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <div className="relative">
                <DoorOpen
                  size={14}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-clOcean/50"
                />
                <input
                  value={roomId}
                  onChange={(e) => setRoomId(sanitizeNumericIdInput(e.target.value))}
                  placeholder="Room ID"
                  className={fieldClass}
                  aria-label="Room ID"
                  autoComplete="off"
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
              </div>
              <div className="relative">
                <CalendarDays
                  size={14}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-clOcean/50"
                />
                <input
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  type="date"
                  className={fieldClass}
                  aria-label="Check-in date"
                />
              </div>
              <div className="relative">
                <CalendarDays
                  size={14}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-clOcean/50"
                />
                <input
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  type="date"
                  className={fieldClass}
                  aria-label="Check-out date"
                />
              </div>
            </div>
            <Button
              className="mt-5 inline-flex items-center gap-2 rounded-xl px-6 py-3"
              onClick={onReserve}
              disabled={loading}
              aria-busy={loading}
            >
              <CreditCard size={15} aria-hidden />
              {loading ? "Securing..." : "Reserve now"}
            </Button>
            {message ? (
              <p role="alert" className="mt-4 inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800">
                <MessageSquareWarning size={14} aria-hidden className="shrink-0 text-amber-600" />
                {message}
              </p>
            ) : null}
          </>
        ) : (
          <div className="mt-6 space-y-3 motion-reduce:animate-none" aria-hidden>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="h-[42px] animate-pulse rounded-xl bg-zinc-100 motion-reduce:animate-none" />
              <div className="h-[42px] animate-pulse rounded-xl bg-zinc-100 motion-reduce:animate-none" />
              <div className="h-[42px] animate-pulse rounded-xl bg-zinc-100 motion-reduce:animate-none" />
            </div>
            <div className="h-11 w-40 animate-pulse rounded-xl bg-zinc-100 motion-reduce:animate-none" />
          </div>
        )}
      </div>
    </div>
  );
}
