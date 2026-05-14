"use client";

import { ReservationFeeBreakdownPanel } from "@/components/booking/ReservationFeeBreakdownPanel";
import { ResortRoomAvailabilityModal } from "@/components/resort-page/ResortRoomAvailabilityModal";
import { useToast } from "@/components/shared/ToastProvider";
import type { LandingComputedRoom } from "@/lib/api/landingPage";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";
import { checkRoomAvailability } from "@/lib/api/public";
import {
  buildResortCheckoutHref,
  addDaysIso,
  defaultPublicStayDates,
  todayIsoLocal,
} from "@/lib/publicBookingLinks";
import { laravelPublicUrl } from "@/lib/publicAsset";
import { amenityMeta, extractRoomMeta, formatPhp } from "@/lib/roomPreviewDisplay";
import { RESERVATION_FEE_REFERENCE_TOTAL } from "@/lib/reservationFeeBreakdown";
import { displayInclusionLabel, isCustomInclusionToken } from "@/lib/roomInclusions";
import { CalendarDays, ImageOff, Loader2, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  room: LandingComputedRoom | null;
  resortId: number;
  onClose: () => void;
};

/**
 * Full-screen room details + stay dates + book / availability — same UX as the public resort landing “Our rooms” modal.
 */
export function ResortRoomDetailsBookingModal({ room, resortId, onClose }: Props) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [modalCheckIn, setModalCheckIn] = useState(() => defaultPublicStayDates().checkIn);
  const [modalCheckOut, setModalCheckOut] = useState(() => defaultPublicStayDates().checkOut);
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [bookChecking, setBookChecking] = useState(false);
  const availabilityOpenRef = useRef(false);
  availabilityOpenRef.current = availabilityOpen;

  const selectedMeta = useMemo(() => (room ? extractRoomMeta(room.amenities) : null), [room]);

  const todayStr = useMemo(() => todayIsoLocal(), []);
  const checkOutMin = modalCheckIn ? addDaysIso(modalCheckIn, 1) : addDaysIso(todayStr, 1);
  const datesValid =
    Boolean(modalCheckIn && modalCheckOut) &&
    modalCheckOut > modalCheckIn &&
    modalCheckIn >= todayStr;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!room) return;
    setActiveImage(0);
    const { checkIn, checkOut } = defaultPublicStayDates();
    setModalCheckIn(checkIn);
    setModalCheckOut(checkOut);
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (availabilityOpenRef.current) {
        setAvailabilityOpen(false);
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", onEscape);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onEscape);
      document.body.style.overflow = "";
      setAvailabilityOpen(false);
    };
  }, [room, onClose]);

  if (!mounted || !room) return null;

  return (
    <>
      {createPortal(
        <div
          className="fixed inset-0 z-[220] flex items-center justify-center bg-zinc-950/72 p-3 md:p-6"
          onClick={onClose}
        >
          <div
            className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-2xl border border-white/40 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid max-h-[92vh] grid-cols-1 overflow-y-auto lg:grid-cols-2">
              <div className="flex min-h-0 flex-col border-b border-zinc-200 bg-zinc-100 lg:border-b-0 lg:border-r">
                <div className="relative h-56 w-full shrink-0 overflow-hidden bg-zinc-200 sm:h-64 lg:h-72">
                  {room.images[activeImage] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={laravelPublicUrl(room.images[activeImage])}
                      alt={room.name}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-zinc-500">
                      <div className="flex flex-col items-center gap-2">
                        <ImageOff size={20} />
                        <span className="text-sm">No room image available</span>
                      </div>
                    </div>
                  )}
                </div>
                {room.images.length > 1 ? (
                  <div className="grid grid-cols-4 gap-2 p-3">
                    {room.images.slice(0, 8).map((img, idx) => (
                      <button
                        type="button"
                        key={`${img}-${idx}`}
                        onClick={() => setActiveImage(idx)}
                        className={`overflow-hidden rounded-lg border ${activeImage === idx ? "border-navy" : "border-zinc-200"}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={laravelPublicUrl(img)} alt="" className="h-16 w-full object-cover" />
                      </button>
                    ))}
                  </div>
                ) : null}

                <div className="border-t border-zinc-200 bg-zinc-50/95 p-3 md:p-4">
                  <div className="rounded-xl border border-sky-200/80 bg-sky-50/80 p-3">
                    <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-sky-900">
                      <CalendarDays size={14} className="shrink-0" />
                      Stay dates
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="block text-[11px] font-medium text-zinc-600">
                        Check-in
                        <input
                          type="date"
                          className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm text-navy"
                          min={todayStr}
                          value={modalCheckIn}
                          onChange={(e) => {
                            const v = e.target.value;
                            setModalCheckIn(v);
                            if (!v) return;
                            const minOut = addDaysIso(v, 1);
                            setModalCheckOut((prev) => (prev <= v ? minOut : prev));
                          }}
                        />
                      </label>
                      <label className="block text-[11px] font-medium text-zinc-600">
                        Check-out
                        <input
                          type="date"
                          className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm text-navy"
                          min={checkOutMin}
                          value={modalCheckOut}
                          onChange={(e) => setModalCheckOut(e.target.value)}
                        />
                      </label>
                    </div>
                    {!datesValid ? (
                      <p className="mt-2 text-[11px] text-amber-800">
                        Choose check-out after check-in (from today onward).
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      disabled={!datesValid || bookChecking}
                      onClick={async () => {
                        if (!datesValid || !room) return;
                        setBookChecking(true);
                        try {
                          const r = await checkRoomAvailability(Number(room.id), modalCheckIn, modalCheckOut);
                          if (!r.available) {
                            pushToast({
                              title: "Those dates are not available",
                              description:
                                "This room is already booked, on hold, or blocked for part of your stay. Try other dates or open Check availability for a calendar view.",
                              tone: "error",
                            });
                            return;
                          }
                          router.push(buildResortCheckoutHref(resortId, room.id, modalCheckIn, modalCheckOut));
                        } catch (err) {
                          pushToast({
                            title: "Could not verify availability",
                            description: parseApiErrorMessage(err, "Check your connection and try again."),
                            tone: "error",
                          });
                        } finally {
                          setBookChecking(false);
                        }
                      }}
                      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold ${
                        datesValid
                          ? "bg-navy text-white hover:bg-navy/90 disabled:opacity-80"
                          : "cursor-not-allowed bg-zinc-200 text-zinc-500"
                      }`}
                    >
                      {bookChecking ? <Loader2 size={16} className="shrink-0 animate-spin" aria-hidden /> : null}
                      Book now
                    </button>
                    <button
                      type="button"
                      onClick={() => setAvailabilityOpen(true)}
                      className="inline-flex items-center justify-center rounded-xl border border-navy/20 bg-white px-4 py-2.5 text-sm font-semibold text-navy shadow-sm hover:bg-zinc-50"
                    >
                      Check availability
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-b from-white to-zinc-50/45 p-5 md:p-6">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-heading text-2xl font-bold text-navy">{room.name}</h3>
                    <p className="mt-1 text-sm text-zinc-500">Room details</p>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50"
                    aria-label="Close room details"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 shadow-sm">
                    <p className="text-xs text-zinc-500">Price per night</p>
                    <p className="font-bold text-emerald-800">{formatPhp(room.basePrice)}</p>
                  </div>
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                    <p className="text-xs text-zinc-500">Maximum guests</p>
                    <p className="inline-flex items-center gap-1 font-semibold text-navy">
                      <Users size={13} />
                      {room.capacity}
                    </p>
                  </div>
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                    <p className="text-xs text-zinc-500">Bed type</p>
                    <p className="font-semibold text-navy">{selectedMeta?.bedType ?? "Standard"}</p>
                  </div>
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                    <p className="text-xs text-zinc-500">Beds</p>
                    <p className="font-semibold text-navy">{selectedMeta?.bedCount ?? 1}</p>
                  </div>
                </div>

                {selectedMeta?.visibleAmenities.length ? (
                  <div className="mb-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Inclusions</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedMeta.visibleAmenities.map((a) => {
                        const meta = amenityMeta(a);
                        const Icon = meta.icon;
                        return (
                          <span
                            key={a}
                            className="inline-flex items-center gap-1 rounded-full border border-zinc-200/90 bg-white/90 px-2.5 py-1 text-xs font-medium text-zinc-700"
                          >
                            <Icon
                              size={12}
                              className={`shrink-0 ${isCustomInclusionToken(a) ? "text-amber-500" : "text-zinc-500"}`}
                              aria-hidden
                            />
                            {displayInclusionLabel(a)}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                <div className="mb-5 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Description</p>
                  <p className="text-sm leading-relaxed text-zinc-700">
                    {room.rules?.trim()
                      ? room.rules
                      : "Enjoy a relaxing and secure stay with complete comfort and guest-first hospitality."}
                  </p>
                </div>

                <ReservationFeeBreakdownPanel totalPhp={RESERVATION_FEE_REFERENCE_TOTAL} variant="compact" className="mb-0" />
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
      {room && availabilityOpen ? (
        <ResortRoomAvailabilityModal
          open={availabilityOpen}
          onClose={() => setAvailabilityOpen(false)}
          roomId={room.id}
          roomName={room.name}
          checkIn={modalCheckIn}
          checkOut={modalCheckOut}
        />
      ) : null}
    </>
  );
}
