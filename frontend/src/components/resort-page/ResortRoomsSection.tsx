"use client";

/**
 * Public resort rooms grid + booking modal.
 * Desktop (lg+): max 3 tiles per row; mobile: 2×2 grid (4 tiles). Additional rooms live behind a subtle “View more rooms” disclosure.
 */

import type { LandingComputedRoom } from "@/lib/api/landingPage";
import {
  BedDouble,
  ChevronDown,
  ImageOff,
  Users,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ResortRoomDetailsBookingModal } from "@/components/resort-page/ResortRoomDetailsBookingModal";
import ScrollReveal from "@/components/shared/ScrollReveal";
import { normalizeRoomImages, roomImageDisplaySrc } from "@/lib/roomImagePreview";
import { formatGuestDisplayPerNight } from "@/lib/guestRoomPricing";
import { amenityMeta, extractRoomMeta } from "@/lib/roomPreviewDisplay";
import type { ResortLandingSurface } from "@/components/resort-page/resortLandingSurface";
import { displayInclusionLabel, isCustomInclusionToken } from "@/lib/roomInclusions";

type Props = {
  rooms: LandingComputedRoom[];
  resortId: number;
  surface: ResortLandingSurface;
};

type RoomPreviewTileProps = {
  room: LandingComputedRoom;
  onSelect: (room: LandingComputedRoom) => void;
  revealDelay?: number;
  className?: string;
};

function RoomPreviewTile({ room, onSelect, revealDelay = 0, className }: RoomPreviewTileProps) {
  const gallery = normalizeRoomImages(room.images);
  const primaryImage = gallery[0];
  const { bedCount, bedType, visibleAmenities } = extractRoomMeta(room.amenities);

  return (
    <ScrollReveal delayMs={revealDelay} direction="up" className={className}>
      <article
        className="group flex h-full w-full flex-col overflow-hidden rounded-xl border border-zinc-200/80 bg-white p-0 shadow-sm transition hover:-translate-y-px hover:shadow-md"
        role="button"
        tabIndex={0}
        onClick={() => onSelect(room)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(room);
          }
        }}
      >
        {primaryImage ? (
          <div className="relative flex aspect-[2/1] w-full items-center justify-center overflow-hidden bg-zinc-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={roomImageDisplaySrc(room.id, primaryImage, "public")}
              alt={room.name}
              className="max-h-full max-w-full object-contain object-center"
            />
          </div>
        ) : (
          <div className="flex aspect-[2/1] w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-zinc-100 to-zinc-200 text-[11px] text-zinc-500">
            <ImageOff size={14} />
            <span>No photo yet</span>
          </div>
        )}

        <div className="flex flex-1 flex-col p-3">
          <h3 className="min-h-0 text-left font-heading text-sm font-semibold leading-tight text-navy line-clamp-2">
            {room.name}
          </h3>

          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-0.5 rounded-full border border-zinc-200/90 bg-zinc-50/90 px-2 py-px text-[10px] font-medium text-zinc-800">
              <Users size={10} className="shrink-0 text-zinc-500" aria-hidden />
              {room.capacity} {room.capacity === 1 ? "guest" : "guests"}
            </span>
            <span className="inline-flex items-center rounded-full border border-zinc-300/80 bg-white px-2 py-px text-[10px] font-semibold text-zinc-800">
              {formatGuestDisplayPerNight(room.basePrice, room.reservationFee)}
            </span>
            {bedCount ? (
              <span className="inline-flex items-center gap-0.5 rounded-full border border-zinc-200/90 bg-zinc-50/90 px-2 py-px text-[10px] font-medium text-zinc-800">
                <BedDouble size={10} className="shrink-0 text-zinc-500" aria-hidden />
                {bedCount} {bedCount === 1 ? "bed" : "beds"}
              </span>
            ) : null}
            {bedType ? (
              <span className="inline-flex items-center rounded-full border border-zinc-200/90 bg-white px-2 py-px text-[10px] font-medium text-zinc-700">
                {bedType}
              </span>
            ) : null}
          </div>

          {visibleAmenities.length > 0 && (
            <div className="mt-1.5 flex flex-wrap content-start gap-1">
              {visibleAmenities.slice(0, 4).map((a) => {
                const meta = amenityMeta(a);
                const Icon = meta.icon;
                return (
                  <span
                    key={a}
                    className="inline-flex items-center gap-0.5 rounded-full border border-zinc-200/90 bg-white/90 px-1.5 py-px text-[9px] font-medium text-zinc-700"
                  >
                    <Icon size={9} className={`shrink-0 ${isCustomInclusionToken(a) ? "text-amber-500" : "text-zinc-500"}`} aria-hidden />
                    {displayInclusionLabel(a)}
                  </span>
                );
              })}
              {visibleAmenities.length > 4 && (
                <span className="rounded-full border border-zinc-200 px-1.5 py-px text-[9px] text-zinc-400">
                  +{visibleAmenities.length - 4} more
                </span>
              )}
            </div>
          )}

          <p className="mt-2 line-clamp-2 text-[10px] leading-snug text-zinc-500">
            {room.rules?.trim() || "Comfortable stay with guest-first amenities."}
          </p>

          <div className="mt-2 border-t border-zinc-200/90 pt-2">
            <span className="inline-flex w-full items-center justify-center rounded-lg bg-navy px-3 py-1.5 text-[11px] font-semibold text-white transition group-hover:bg-navy/90">
              View room details
            </span>
          </div>
        </div>
      </article>
    </ScrollReveal>
  );
}

export function ResortRoomsSection({ rooms, resortId, surface }: Props) {
  const [selectedRoom, setSelectedRoom] = useState<LandingComputedRoom | null>(null);

  if (rooms.length === 0) return null;

  const band = surface === "odd" ? "resort-landing-band-odd" : "resort-landing-band-even";
  const revealDir = surface === "even" ? "down" : "up";

  return (
    <section
      id="rooms"
      className={`resort-landing-section !py-5 sm:!py-6 lg:!py-7 scroll-mt-24 border-t border-zinc-200/70 ${band}`}
    >
      <ScrollReveal className="resort-landing-container" direction={revealDir} delayMs={50}>
        <h2 className="font-pop text-xl font-extrabold tracking-tight text-navy sm:text-2xl">
          Our rooms
        </h2>
        <p className="mt-1.5 max-w-2xl text-pretty text-xs leading-snug text-zinc-600 max-lg:max-w-[20rem]">
          Choose an accommodation and pick your dates to book with a secure online reservation fee.
        </p>
        <div className="mt-2 h-px max-w-sm bg-gradient-to-r from-zinc-400/70 via-zinc-200/80 to-transparent" />

        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
          {rooms.slice(0, 3).map((room, i) => (
            <RoomPreviewTile
              key={room.id}
              room={room}
              onSelect={setSelectedRoom}
              revealDelay={Math.min(220, (room.id % 4) * 70 + i * 24)}
            />
          ))}
          {rooms[3] ? (
            <RoomPreviewTile
              key={rooms[3].id}
              room={rooms[3]}
              onSelect={setSelectedRoom}
              revealDelay={Math.min(220, (rooms[3].id % 4) * 70)}
              className="lg:hidden"
            />
          ) : null}
        </div>

        {rooms.length > 3 ? (
          <details
            className={cn(
              "group mt-3 w-full border-0 bg-transparent p-0",
              rooms.length === 4 && "hidden lg:block",
            )}
          >
            <summary className="mx-auto flex w-full max-w-md cursor-pointer list-none items-center justify-center gap-1.5 rounded-full border border-zinc-200/60 bg-zinc-50/40 py-2 text-[11px] font-medium text-zinc-500 shadow-none transition hover:border-zinc-300/80 hover:bg-zinc-100/60 hover:text-zinc-700 marker:content-none [&::-webkit-details-marker]:hidden">
              <ChevronDown
                size={14}
                className="shrink-0 text-zinc-400 transition duration-200 group-open:rotate-180"
                aria-hidden
              />
              <span>View more rooms</span>
              <span className="tabular-nums text-zinc-400">
                <span className="lg:hidden">({rooms.length - 4})</span>
                <span className="hidden lg:inline">({rooms.length - 3})</span>
              </span>
            </summary>
            <div className="mt-3 border-t border-zinc-200/60 pt-3">
              <div className="hidden grid-cols-3 gap-3 lg:grid">
                {rooms.slice(3).map((room, i) => (
                  <RoomPreviewTile
                    key={room.id}
                    room={room}
                    onSelect={setSelectedRoom}
                    revealDelay={80 + i * 40}
                  />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 lg:hidden">
                {rooms.slice(4).map((room, i) => (
                  <RoomPreviewTile
                    key={room.id}
                    room={room}
                    onSelect={setSelectedRoom}
                    revealDelay={80 + i * 40}
                  />
                ))}
              </div>
            </div>
          </details>
        ) : null}
      </ScrollReveal>

      <ResortRoomDetailsBookingModal
        room={selectedRoom}
        resortId={resortId}
        onClose={() => setSelectedRoom(null)}
      />
    </section>
  );
}
