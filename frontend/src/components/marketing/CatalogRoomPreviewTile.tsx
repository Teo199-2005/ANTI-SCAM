"use client";

import type { PublicRoom } from "@/lib/api/public";
import { normalizeRoomImages, roomImageDisplaySrc } from "@/lib/roomImagePreview";
import { amenityMeta, extractRoomMeta, formatPhpPerNight } from "@/lib/roomPreviewDisplay";
import { displayInclusionLabel, isCustomInclusionToken } from "@/lib/roomInclusions";
import { cn } from "@/lib/utils";
import { BedDouble, ImageOff, Users } from "lucide-react";

type Props = {
  room: PublicRoom;
  onSelect: () => void;
  className?: string;
};

/** Room tile with primary photo — matches guest landing / resort “Our rooms” cards. */
export function CatalogRoomPreviewTile({ room, onSelect, className }: Props) {
  const gallery = normalizeRoomImages(room.images);
  const primaryImage = gallery[0];
  const { bedCount, bedType, visibleAmenities } = extractRoomMeta(room.amenities ?? []);

  return (
    <article
      className={cn(
        "group flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-xl border border-zinc-200/80 bg-white p-0 shadow-sm transition hover:-translate-y-0.5 hover:border-clOcean/25 hover:shadow-md",
        className,
      )}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      {primaryImage ? (
        <div className="relative flex aspect-[2/1] w-full items-center justify-center overflow-hidden bg-zinc-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={roomImageDisplaySrc(room.id, primaryImage, "public")}
            alt={room.name}
            className="max-h-full max-w-full object-contain object-center transition duration-300 group-hover:scale-[1.02]"
          />
        </div>
      ) : (
        <div className="flex aspect-[2/1] w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-zinc-100 to-zinc-200 text-[11px] text-zinc-500">
          <ImageOff size={14} aria-hidden />
          <span>No photo yet</span>
        </div>
      )}

      <div className="flex flex-1 flex-col p-3">
        <h3 className="line-clamp-2 text-left font-heading text-sm font-semibold leading-tight text-[#0d1f3c]">
          {room.name}
        </h3>

        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-0.5 rounded-full border border-zinc-200/90 bg-zinc-50/90 px-2 py-px text-[10px] font-medium text-zinc-800">
            <Users size={10} className="shrink-0 text-zinc-500" aria-hidden />
            {room.capacity} {room.capacity === 1 ? "guest" : "guests"}
          </span>
          <span className="inline-flex items-center rounded-full border border-zinc-300/80 bg-white px-2 py-px text-[10px] font-semibold text-zinc-800">
            {formatPhpPerNight(room.basePrice)}
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

        {visibleAmenities.length > 0 ? (
          <div className="mt-1.5 flex flex-wrap content-start gap-1">
            {visibleAmenities.slice(0, 3).map((a) => {
              const meta = amenityMeta(a);
              const Icon = meta.icon;
              return (
                <span
                  key={a}
                  className="inline-flex items-center gap-0.5 rounded-full border border-zinc-200/90 bg-white/90 px-1.5 py-px text-[9px] font-medium text-zinc-700"
                >
                  <Icon
                    size={9}
                    className={cn("shrink-0", isCustomInclusionToken(a) ? "text-amber-500" : "text-zinc-500")}
                    aria-hidden
                  />
                  {displayInclusionLabel(a)}
                </span>
              );
            })}
          </div>
        ) : null}

        <div className="mt-2 border-t border-zinc-200/90 pt-2">
          <span className="inline-flex w-full items-center justify-center rounded-lg bg-[#0d1f3c] px-3 py-1.5 text-[11px] font-semibold text-white transition group-hover:bg-[#0d1f3c]/90">
            Book now
          </span>
        </div>
      </div>
    </article>
  );
}
