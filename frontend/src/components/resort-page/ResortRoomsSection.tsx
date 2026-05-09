 "use client";

import Link from "next/link";
import type { LandingComputedRoom } from "@/lib/api/landingPage";
import {
  BedDouble,
  Car,
  Coffee,
  ImageOff,
  ShieldCheck,
  ShowerHead,
  Snowflake,
  Tv,
  Users,
  Waves,
  Wifi,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import ScrollReveal from "@/components/shared/ScrollReveal";
import { createPortal } from "react-dom";

function extractRoomMeta(amenities: string[]) {
  const bedCountRaw = amenities.find((a) => a.startsWith("BED_COUNT:"))?.split(":")[1] ?? null;
  const bedTypeRaw = amenities.find((a) => a.startsWith("BED_TYPE:"))?.split(":")[1] ?? null;
  const bedCount = bedCountRaw ? Number(bedCountRaw) : null;
  const bedType = bedTypeRaw ?? null;
  const visibleAmenities = amenities.filter(
    (a) => !a.startsWith("BED_COUNT:") && !a.startsWith("BED_TYPE:"),
  );
  return { bedCount, bedType, visibleAmenities };
}

function amenityMeta(label: string): { icon: LucideIcon; tone: string } {
  const normalized = label.toLowerCase();
  if (normalized.includes("wifi")) return { icon: Wifi, tone: "text-sky-700 bg-sky-50 border-sky-200/80" };
  if (normalized.includes("shower")) return { icon: ShowerHead, tone: "text-cyan-700 bg-cyan-50 border-cyan-200/80" };
  if (normalized.includes("air")) return { icon: Snowflake, tone: "text-indigo-700 bg-indigo-50 border-indigo-200/80" };
  if (normalized.includes("tv") || normalized.includes("netflix"))
    return { icon: Tv, tone: "text-violet-700 bg-violet-50 border-violet-200/80" };
  if (normalized.includes("pool") || normalized.includes("jacuzzi"))
    return { icon: Waves, tone: "text-teal-700 bg-teal-50 border-teal-200/80" };
  if (normalized.includes("breakfast") || normalized.includes("drink"))
    return { icon: Coffee, tone: "text-amber-700 bg-amber-50 border-amber-200/80" };
  if (normalized.includes("parking")) return { icon: Car, tone: "text-slate-700 bg-slate-50 border-slate-200/80" };
  return { icon: ShieldCheck, tone: "text-zinc-700 bg-zinc-50 border-zinc-200/80" };
}

type Props = {
  rooms: LandingComputedRoom[];
  checkoutHref: string;
};

export function ResortRoomsSection({ rooms, checkoutHref }: Props) {
  const [selectedRoom, setSelectedRoom] = useState<LandingComputedRoom | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [mounted, setMounted] = useState(false);

  const selectedMeta = useMemo(
    () => (selectedRoom ? extractRoomMeta(selectedRoom.amenities) : null),
    [selectedRoom],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!selectedRoom) return;
    setActiveImage(0);
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedRoom(null);
    };
    window.addEventListener("keydown", onEscape);
    document.body.style.overflow = "hidden";
    return () => window.removeEventListener("keydown", onEscape);
  }, [selectedRoom]);

  useEffect(() => {
    if (!selectedRoom) {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedRoom]);

  if (rooms.length === 0) return null;

  return (
    <section id="rooms" className="resort-light-pattern px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="font-heading text-3xl font-bold text-navy sm:text-4xl">Our rooms</h2>
        <p className="mt-3 text-sm text-zinc-600">Choose from our available accommodations below.</p>
        <div className="mt-4 h-px w-full bg-zinc-300/90" />

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => {
            const primaryImage = room.images[0];
            const { bedCount, bedType, visibleAmenities } = extractRoomMeta(room.amenities);
            return (
              <ScrollReveal key={room.id} delayMs={Math.min(220, (room.id % 4) * 70)} direction="up">
                <article
                  className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200/90 bg-gradient-to-b from-white via-white to-zinc-50/70 shadow-[0_12px_30px_rgba(2,6,23,0.12)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(2,6,23,0.18)]"
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedRoom(room)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedRoom(room);
                    }
                  }}
                >
                {primaryImage ? (
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={primaryImage}
                      alt={room.name}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy/10 via-transparent to-transparent" />
                  </div>
                ) : (
                  <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-zinc-100 to-zinc-200 text-sm text-zinc-500">
                    <ImageOff size={18} />
                    <span>No photo yet</span>
                  </div>
                )}

                <div className="flex flex-1 flex-col p-5">
                  <h3 className="min-h-[3.1rem] text-left font-heading text-base font-semibold leading-6 text-navy line-clamp-2">
                    {room.name}
                  </h3>

                  <div className="mt-2 min-h-[2rem] flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700">
                      {room.capacity} {room.capacity === 1 ? "guest" : "guests"}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                      ₱{Number(room.basePrice).toLocaleString()}/night
                    </span>
                    {bedCount ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                        <BedDouble size={12} />
                        {bedCount} {bedCount === 1 ? "bed" : "beds"}
                      </span>
                    ) : null}
                    {bedType ? (
                      <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
                        {bedType}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-2 min-h-[1.75rem]">
                    {bedType ? (
                      <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
                        {bedType}
                      </span>
                    ) : null}
                  </div>

                  {visibleAmenities.length > 0 && (
                    <div className="mt-2 min-h-[3.75rem] flex flex-wrap content-start gap-1.5">
                      {visibleAmenities.slice(0, 4).map((a) => (
                        (() => {
                          const meta = amenityMeta(a);
                          const Icon = meta.icon;
                          return (
                            <span
                              key={a}
                              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${meta.tone}`}
                            >
                              <Icon size={11} />
                              {a}
                            </span>
                          );
                        })()
                      ))}
                      {visibleAmenities.length > 4 && (
                        <span className="rounded-full border border-zinc-200 px-2 py-0.5 text-[11px] text-zinc-400">
                          +{visibleAmenities.length - 4} more
                        </span>
                      )}
                    </div>
                  )}

                  <p className="mt-3 min-h-[2.5rem] text-xs leading-relaxed text-zinc-500 line-clamp-2">
                    {room.rules?.trim() || "Comfortable stay with guest-first amenities."}
                  </p>

                  <div className="mt-auto border-t border-zinc-300/90 pt-4">
                    <span className="inline-flex w-full items-center justify-center rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy/90">
                      View room details
                    </span>
                  </div>
                </div>
                </article>
              </ScrollReveal>
            );
          })}
        </div>
      </div>

      {mounted && selectedRoom
        ? createPortal(
            <div
              className="fixed inset-0 z-[220] flex items-center justify-center bg-zinc-950/72 p-3 md:p-6"
              onClick={() => setSelectedRoom(null)}
            >
              <div
                className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-2xl border border-white/40 bg-white shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="grid max-h-[92vh] grid-cols-1 overflow-y-auto lg:grid-cols-2">
              <div className="border-b border-zinc-200 bg-zinc-100 lg:border-b-0 lg:border-r">
                <div className="aspect-[16/10] w-full bg-zinc-200">
                  {selectedRoom.images[activeImage] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedRoom.images[activeImage]}
                      alt={selectedRoom.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-zinc-500">
                      <div className="flex flex-col items-center gap-2">
                        <ImageOff size={20} />
                        <span className="text-sm">No room image available</span>
                      </div>
                    </div>
                  )}
                </div>
                {selectedRoom.images.length > 1 ? (
                  <div className="grid grid-cols-4 gap-2 p-3">
                    {selectedRoom.images.slice(0, 8).map((img, idx) => (
                      <button
                        type="button"
                        key={`${img}-${idx}`}
                        onClick={() => setActiveImage(idx)}
                        className={`overflow-hidden rounded-lg border ${activeImage === idx ? "border-navy" : "border-zinc-200"}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img} alt="" className="h-16 w-full object-cover" />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="bg-gradient-to-b from-white to-zinc-50/45 p-5 md:p-6">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-heading text-2xl font-bold text-navy">{selectedRoom.name}</h3>
                    <p className="mt-1 text-sm text-zinc-500">Accommodation details modal</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedRoom(null)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50"
                    aria-label="Close room details"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 shadow-sm">
                    <p className="text-xs text-zinc-500">Price per night</p>
                    <p className="font-bold text-emerald-700">₱{Number(selectedRoom.basePrice).toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                    <p className="text-xs text-zinc-500">Maximum guests</p>
                    <p className="inline-flex items-center gap-1 font-semibold text-navy">
                      <Users size={13} />
                      {selectedRoom.capacity}
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
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${meta.tone}`}
                          >
                            <Icon size={12} />
                            {a}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                <div className="mb-5 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Description</p>
                  <p className="text-sm leading-relaxed text-zinc-700">
                    {selectedRoom.rules?.trim()
                      ? selectedRoom.rules
                      : "Enjoy a relaxing and secure stay with complete comfort and guest-first hospitality."}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Link
                    href={checkoutHref}
                    className="inline-flex items-center justify-center rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy/90"
                  >
                    Book now
                  </Link>
                  <Link
                    href={checkoutHref}
                    className="inline-flex items-center justify-center rounded-xl border border-navy/20 bg-white px-4 py-2.5 text-sm font-semibold text-navy hover:bg-zinc-50"
                  >
                    Check availability
                  </Link>
                </div>
              </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}
