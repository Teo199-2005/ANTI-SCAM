"use client";

import { PremiumHighlyRecommendedRibbon } from "@/components/marketing/PremiumHighlyRecommendedRibbon";
import { ResortCatalogBadges } from "@/components/marketing/ResortCatalogBadges";
import { PREMIUM_MARKETING_BORDER_CLASS } from "@/lib/marketingGoldRibbon";
import { ResortLogoWatermark } from "@/components/marketing/ResortLogoWatermark";
import Button from "@/components/ui/Button";
import type { PublicResortListItem } from "@/lib/api/public";
import { formatPhp } from "@/lib/formatPhp";
import { laravelPublicUrl } from "@/lib/publicAsset";
import { cn } from "@/lib/utils";
import { BedDouble, Building2, ExternalLink, MapPin } from "lucide-react";
import Image from "next/image";

const NAVY = "#0d1f3c";

type Props = {
  resort: PublicResortListItem;
  onViewRooms: () => void;
  onViewWebsite: () => void;
  className?: string;
  compact?: boolean;
};

function catalogCardBorderClass(resort: PublicResortListItem): string {
  if (resort.isPremiumVerified) {
    return cn(
      PREMIUM_MARKETING_BORDER_CLASS,
      "motion-safe:hover:border-amber-400 motion-safe:hover:shadow-[0_12px_44px_-10px_rgba(180,110,0,0.28)]",
    );
  }
  if (resort.isVip) {
    return cn(
      "border-2 border-violet-400/85",
      "shadow-[0_1px_2px_rgba(109,40,217,0.06),0_8px_24px_-12px_rgba(109,40,217,0.14)]",
      "motion-safe:hover:border-violet-500 motion-safe:hover:shadow-[0_8px_32px_-10px_rgba(109,40,217,0.22)]",
    );
  }
  return cn(
    "border-2 border-zinc-200",
    "shadow-[0_1px_2px_rgba(13,30,66,0.06),0_8px_24px_-12px_rgba(13,30,66,0.1)]",
    "motion-safe:hover:border-zinc-300 motion-safe:hover:shadow-[0_8px_28px_-12px_rgba(13,30,66,0.16)]",
  );
}

/** Catalog grid card — background hero, logo watermark, tiered borders. */
export function BrowseResortCard({ resort, onViewRooms, onViewWebsite, className, compact = true }: Props) {
  const bgSrc = resort.backgroundImageUrl
    ? laravelPublicUrl(resort.backgroundImageUrl)
    : null;

  const premium = Boolean(resort.isPremiumVerified);

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col rounded-2xl bg-white",
        premium ? "overflow-visible" : "overflow-hidden",
        "transition-[transform,box-shadow,border-color] duration-300 ease-out",
        "motion-safe:hover:-translate-y-1.5 max-sm:motion-safe:hover:translate-y-0",
        "focus-within:ring-2 focus-within:ring-clOcean/25 focus-within:ring-offset-2",
        catalogCardBorderClass(resort),
        className,
      )}
    >
      {premium ? <PremiumHighlyRecommendedRibbon variant="border" /> : null}
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-hidden max-sm:min-h-[8.75rem] max-sm:flex-row",
          premium ? "rounded-[14px]" : "rounded-2xl",
        )}
      >
      <div
        className={cn(
          "relative shrink-0 overflow-hidden",
          compact
            ? "aspect-[5/4] max-sm:aspect-auto max-sm:h-auto max-sm:min-h-[8.75rem] max-sm:w-[38%] max-sm:min-w-[7.25rem]"
            : "aspect-[16/10] max-sm:aspect-auto max-sm:min-h-[8.75rem] max-sm:w-[38%]",
        )}
      >
        {bgSrc ? (
          <Image
            src={bgSrc}
            alt=""
            fill
            className="object-cover transition duration-500 motion-safe:group-hover:scale-[1.04]"
            sizes="(max-width: 640px) 38vw, 20vw"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-sky-200/80 via-clOcean/30 to-[#0d1f3c]/90">
            <div className="flex h-full items-center justify-center text-white/40">
              <Building2 size={compact ? 36 : 48} strokeWidth={1.1} aria-hidden />
            </div>
          </div>
        )}
        <div
          className="absolute inset-0 bg-gradient-to-t from-[#0d1f3c]/95 via-[#0d1f3c]/50 to-[#0d1f3c]/10"
          aria-hidden
        />
        <ResortLogoWatermark
          logoUrl={resort.logoUrl}
          resortName={resort.name}
          size={compact ? "sm" : "md"}
          className="max-sm:scale-[0.85] max-sm:origin-top-right"
        />
        <div className="absolute inset-x-0 bottom-0 p-2.5 sm:p-3.5">
          <h2
            className={cn(
              "font-heading font-bold leading-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]",
              compact ? "line-clamp-3 text-sm sm:line-clamp-2 sm:text-base" : "text-lg sm:text-xl",
            )}
          >
            {resort.name}
          </h2>
          {resort.address ? (
            <p
              className={cn(
                "mt-1 flex items-start gap-1 font-medium leading-snug text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]",
                compact ? "line-clamp-2 text-[10px] max-sm:hidden sm:text-[11px]" : "text-xs max-sm:hidden",
              )}
            >
              <MapPin size={11} className="mt-0.5 shrink-0 text-amber-200/95" aria-hidden />
              <span>{resort.address}</span>
            </p>
          ) : null}
          <ResortCatalogBadges
            badgeLabel={resort.badgeLabel}
            isPremiumVerified={resort.isPremiumVerified}
            isVip={resort.isVip}
            className="mt-1.5 max-sm:hidden sm:mt-2"
          />
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col max-sm:border-l max-sm:border-zinc-100/90 sm:contents">
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col border-t border-zinc-100/90 max-sm:flex-1 max-sm:border-t-0",
            compact ? "px-3 py-2.5 max-sm:px-2.5 max-sm:py-2" : "px-4 py-3 max-sm:px-2.5 max-sm:py-2",
          )}
        >
          <ResortCatalogBadges
            badgeLabel={resort.badgeLabel}
            isPremiumVerified={resort.isPremiumVerified}
            isVip={resort.isVip}
            className="mb-1.5 sm:hidden"
          />
          {resort.address ? (
            <p className="mb-1 flex items-start gap-1 text-[10px] leading-snug text-zinc-500 sm:hidden">
              <MapPin size={10} className="mt-0.5 shrink-0 text-amber-600/90" aria-hidden />
              <span className="line-clamp-2">{resort.address}</span>
            </p>
          ) : null}
          {resort.description ? (
            <p
              className={cn(
                "flex-1 leading-relaxed text-zinc-600 max-sm:hidden",
                compact ? "line-clamp-2 text-[10px]" : "line-clamp-2 text-xs",
              )}
            >
              {resort.description}
            </p>
          ) : (
            <p className={cn("flex-1 text-zinc-500 max-sm:hidden", compact ? "text-[10px]" : "text-xs")}>
              Verified on Anti-Scam PH
            </p>
          )}
          {resort.priceFrom != null && resort.priceFrom > 0 ? (
            <p
              className={cn(
                "rounded-md border border-sky-100 bg-sky-50/90 font-semibold leading-tight max-sm:mt-auto",
                compact
                  ? "mt-2 px-2 py-1 text-center text-[10px] max-sm:mt-1 max-sm:py-0.5 max-sm:text-left max-sm:text-[9px]"
                  : "mt-2 px-3 py-1.5 text-center text-xs max-sm:text-left",
              )}
              style={{ color: NAVY }}
              title="Lowest nightly rate among active rooms (reservation fee added at checkout)"
            >
              Rooms from {formatPhp(resort.priceFrom)}
              <span className="font-medium text-zinc-500">/night</span>
            </p>
          ) : null}
        </div>

        <div
          className={cn(
            "mt-auto shrink-0 border-t border-zinc-100 bg-zinc-50/90 max-sm:mt-0",
            compact ? "px-2.5 py-2 max-sm:px-2 max-sm:py-1.5" : "px-3 py-2.5 max-sm:px-2 max-sm:py-1.5",
          )}
        >
          <div
            className={cn(
              "flex gap-1.5",
              compact ? "flex-col max-sm:flex-row max-sm:gap-1" : "flex-col sm:flex-row max-sm:flex-row",
            )}
          >
            <Button
              type="button"
              className={cn(
                "inline-flex w-full flex-1 items-center justify-center gap-1.5",
                compact
                  ? "py-1.5 text-[10px] max-sm:min-h-9 max-sm:px-2 max-sm:py-1.5 max-sm:text-[9px]"
                  : "text-xs max-sm:py-1.5",
              )}
              onClick={onViewRooms}
            >
              <BedDouble
                size={compact ? 12 : 13}
                strokeWidth={2}
                className="shrink-0 opacity-75"
                aria-hidden
              />
              View rooms
            </Button>
            <button
              type="button"
              onClick={onViewWebsite}
              className={cn(
                "inline-flex w-full flex-1 items-center justify-center gap-1.5 rounded-full border border-zinc-200 bg-white font-semibold text-zinc-700",
                "transition hover:border-clOcean/30 hover:bg-white hover:shadow-sm",
                compact
                  ? "py-1.5 text-[10px] max-sm:min-h-9 max-sm:px-2 max-sm:py-1.5 max-sm:text-[9px]"
                  : "py-2 text-xs max-sm:py-1.5",
              )}
            >
              <ExternalLink
                size={compact ? 12 : 13}
                strokeWidth={2}
                className="shrink-0 opacity-60"
                aria-hidden
              />
              View website
            </button>
          </div>
        </div>
      </div>
      </div>
    </article>
  );
}
