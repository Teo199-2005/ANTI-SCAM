"use client";

import { CatalogResortMapEmbed } from "@/components/marketing/CatalogResortMapEmbed";
import { PremiumHighlyRecommendedRibbon } from "@/components/marketing/PremiumHighlyRecommendedRibbon";
import { PREMIUM_MARKETING_BORDER_CLASS } from "@/lib/marketingGoldRibbon";
import { CatalogRoomPreviewTile } from "@/components/marketing/CatalogRoomPreviewTile";
import { ResortCatalogBadges } from "@/components/marketing/ResortCatalogBadges";
import { ResortLogoWatermark } from "@/components/marketing/ResortLogoWatermark";
import { ResortRoomDetailsBookingModal } from "@/components/resort-page/ResortRoomDetailsBookingModal";
import Button from "@/components/ui/Button";
import type { LandingComputedRoom } from "@/lib/api/landingPage";
import {
  getPublicResort,
  getPublicResortBySlug,
  type PublicResortListItem,
  type PublicResortMap,
  type PublicRoom,
} from "@/lib/api/public";
import { laravelPublicUrl } from "@/lib/publicAsset";
import { catalogResortPublicHref } from "@/lib/urls/catalogResortPublicHref";
import { resolvePublicResortMap } from "@/lib/urls/publicResortMap";
import { cn } from "@/lib/utils";
import { DismissibleModalShell } from "@/components/ui/DismissibleModalShell";
import {
  MARKETING_MODAL_PANEL_MAX_H_LG,
  MARKETING_MODAL_Z,
  MARKETING_MODAL_Z_NESTED,
} from "@/lib/marketingModalLayout";
import { ModalCloseButton } from "@/components/ui/ModalCloseButton";
import { ExternalLink, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

type Props = {
  resort: PublicResortListItem;
  open: boolean;
  onClose: () => void;
};

async function fetchPublicResortDetail(resort: PublicResortListItem) {
  if (resort.slug?.trim()) {
    try {
      return await getPublicResortBySlug(resort.slug.trim());
    } catch {
      /* fall through to id */
    }
  }
  return getPublicResort(resort.id);
}

function toLandingRoom(room: PublicRoom): LandingComputedRoom {
  return {
    id: room.id,
    name: room.name,
    capacity: room.capacity,
    basePrice: room.basePrice,
    reservationFee: room.reservationFee,
    amenities: room.amenities ?? [],
    rules: room.rules ?? null,
    images: (room.images ?? []).map((img) => ({ id: img.id, url: img.url })),
  };
}

export function ResortRoomsPreviewModal({ resort, open, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rooms, setRooms] = useState<PublicRoom[]>([]);
  const [map, setMap] = useState<PublicResortMap | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<PublicRoom | null>(null);

  useEffect(() => {
    if (!open) {
      setSelectedRoom(null);
      setMap(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const detail = await fetchPublicResortDetail(resort);
        if (cancelled) return;
        setRooms(detail.rooms ?? []);
        setMap(resolvePublicResortMap(detail.map, detail.address ?? resort.address));
      } catch {
        if (!cancelled) setError("Could not load rooms. Try again from the resort page.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, resort.id, resort.slug]);

  if (!open) return null;

  if (selectedRoom) {
    return (
      <ResortRoomDetailsBookingModal
        room={toLandingRoom(selectedRoom)}
        resortId={resort.id}
        onClose={() => setSelectedRoom(null)}
        imageAccess="public"
        overlayZIndexClass={MARKETING_MODAL_Z_NESTED}
      />
    );
  }

  const heroBg = resort.backgroundImageUrl ? laravelPublicUrl(resort.backgroundImageUrl) : null;
  const publicHref = catalogResortPublicHref(resort);
  const hasPublicSite = Boolean(resort.slug?.trim());
  const displayMap = map ?? resolvePublicResortMap(null, resort.address);
  const premium = Boolean(resort.isPremiumVerified);

  return (
    <DismissibleModalShell
      open={open}
      onClose={onClose}
      zIndexClass={MARKETING_MODAL_Z}
      backdropClassName="bg-zinc-950/70 backdrop-blur-[4px]"
    >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="resort-rooms-modal-title"
          className={cn(
            "pointer-events-auto relative flex w-full max-w-5xl flex-col rounded-t-2xl border bg-white shadow-2xl sm:rounded-2xl",
            premium ? cn("overflow-visible", PREMIUM_MARKETING_BORDER_CLASS) : "overflow-hidden border border-zinc-200/90",
            MARKETING_MODAL_PANEL_MAX_H_LG,
          )}
          onClick={(e) => e.stopPropagation()}
        >
        {premium ? <PremiumHighlyRecommendedRibbon variant="border" /> : null}
        <div className={cn("flex min-h-0 flex-1 flex-col overflow-hidden", premium && "rounded-2xl")}>
        <div className="relative shrink-0 overflow-hidden border-b border-zinc-200">
          {heroBg ? (
            <>
              <div className="relative h-28 w-full sm:h-32">
                <Image src={heroBg} alt="" fill className="object-cover" sizes="800px" unoptimized />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0d1f3c]/90 via-[#0d1f3c]/40 to-transparent" aria-hidden />
                <ResortLogoWatermark
                  logoUrl={resort.logoUrl}
                  resortName={resort.name}
                  size="lg"
                  className="right-12 top-2 sm:right-14 sm:top-2.5"
                />
              </div>
              <div className="absolute inset-x-0 bottom-0 px-4 pb-3 pt-8 sm:px-5">
                <ModalHeaderContent
                  resort={resort}
                  publicHref={publicHref}
                  hasPublicSite={hasPublicSite}
                  onClose={onClose}
                  onDark
                />
              </div>
            </>
          ) : (
            <div className="bg-gradient-to-br from-sky-50 via-white to-amber-50/50 px-4 py-3 sm:px-5">
              <ModalHeaderContent
                resort={resort}
                publicHref={publicHref}
                hasPublicSite={hasPublicSite}
                onClose={onClose}
              />
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          {displayMap ? (
            <CatalogResortMapEmbed
              resortName={resort.name}
              map={displayMap}
              compact
              className="mb-4"
            />
          ) : null}

          {loading ? (
            <p className="flex items-center justify-center gap-2 py-16 text-sm text-zinc-500">
              <Loader2 className="h-5 w-5 animate-spin text-clOcean" aria-hidden />
              Loading rooms…
            </p>
          ) : null}

          {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}

          {!loading && !error && rooms.length === 0 ? (
            <p className="py-12 text-center text-sm text-zinc-500">No active rooms listed yet.</p>
          ) : null}

          {!loading && rooms.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room) => (
                <CatalogRoomPreviewTile key={room.id} room={room} onSelect={() => setSelectedRoom(room)} />
              ))}
            </div>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-zinc-100 bg-zinc-50/90 px-4 py-3 sm:px-5">
          <Link
            href={publicHref}
            className="block"
            onClick={onClose}
            {...(hasPublicSite ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            <Button type="button" className="inline-flex w-full items-center justify-center gap-2">
              <ExternalLink size={14} className="opacity-80" aria-hidden />
              {hasPublicSite ? "Open public booking page" : "View resort on Anti-Scam PH"}
            </Button>
          </Link>
        </div>
        </div>
        </div>
    </DismissibleModalShell>
  );
}

function ModalHeaderContent({
  resort,
  publicHref,
  hasPublicSite,
  onClose,
  onDark = false,
}: {
  resort: PublicResortListItem;
  publicHref: string;
  hasPublicSite: boolean;
  onClose: () => void;
  onDark?: boolean;
}) {
  return (
    <div className="relative flex items-start justify-between gap-3">
      <div className="min-w-0 pr-10 sm:pr-12">
        <h2
          id="resort-rooms-modal-title"
          className={cn(
            "font-heading text-lg font-bold leading-tight sm:text-xl",
            onDark ? "text-white drop-shadow-sm" : "text-[#0d1f3c]",
          )}
        >
          {resort.name}
        </h2>
        <ResortCatalogBadges
          badgeLabel={resort.badgeLabel}
          isPremiumVerified={resort.isPremiumVerified}
          isVip={resort.isVip}
          className="mt-1.5"
        />
        <p className={cn("mt-1 text-[11px]", onDark ? "text-white/70" : "text-zinc-500")}>
          Tap a room to check dates and book
        </p>
        <Link
          href={publicHref}
          onClick={onClose}
          {...(hasPublicSite ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className={cn(
            "mt-2 inline-flex max-w-full flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] font-semibold underline-offset-2 hover:underline",
            onDark ? "text-sky-100/95" : "text-clOcean",
          )}
        >
          <ExternalLink size={12} className="shrink-0 opacity-80" aria-hidden />
          <span>{hasPublicSite ? "Public booking page" : "Resort on Anti-Scam PH"}</span>
          <span
            className={cn("font-mono text-[10px] font-normal", onDark ? "text-white/55" : "text-zinc-400")}
          >
            {publicHref}
          </span>
        </Link>
      </div>
      <ModalCloseButton
        onClose={onClose}
        tone={onDark ? "dark" : "light"}
        className="absolute right-3 top-3 sm:right-4 sm:top-4"
      />
    </div>
  );
}
