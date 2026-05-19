"use client";

import { ResortCatalogBadges } from "@/components/marketing/ResortCatalogBadges";
import { ResortLogoWatermark } from "@/components/marketing/ResortLogoWatermark";
import type { PublicResortListItem } from "@/lib/api/public";
import { cn } from "@/lib/utils";
import { ModalCloseButton } from "@/components/ui/ModalCloseButton";

const NAVY = "#0d1f3c";

type Props = {
  resort: Pick<
    PublicResortListItem,
    "name" | "logoUrl" | "badgeLabel" | "isPremiumVerified" | "isVip" | "activeRoomsCount"
  >;
  onClose?: () => void;
  titleId?: string;
  className?: string;
  /** Denser header for modals */
  compact?: boolean;
};

/** Shared header strip for resort preview modals — logo as top-right watermark. */
export function ResortCatalogPanelHeader({ resort, onClose, titleId, className, compact }: Props) {
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden border-b border-zinc-100 bg-gradient-to-br from-sky-50/90 via-white to-amber-50/40",
        compact ? "px-3 py-2.5" : "px-4 py-3.5 sm:px-5 sm:py-4",
        className,
      )}
    >
      <ResortLogoWatermark
        logoUrl={resort.logoUrl}
        resortName={resort.name}
        size={compact ? "xs" : "sm"}
        className={onClose ? "right-10 sm:right-11" : undefined}
      />
      {onClose ? (
        <ModalCloseButton onClose={onClose} className="absolute right-2.5 top-2.5 z-20 sm:right-3 sm:top-3" />
      ) : null}
      <div className={cn("min-w-0", onClose && "pr-8", resort.logoUrl && "pr-14 sm:pr-16")}>
        <h2
          id={titleId}
          className={cn(
            "font-heading font-semibold leading-snug",
            compact ? "line-clamp-2 text-[13px]" : "text-base sm:text-lg",
          )}
          style={{ color: NAVY }}
        >
          {resort.name}
        </h2>
        <ResortCatalogBadges
          badgeLabel={resort.badgeLabel}
          isPremiumVerified={resort.isPremiumVerified}
          isVip={resort.isVip}
          activeRoomsCount={compact ? undefined : resort.activeRoomsCount}
          className={cn(compact ? "mt-1 gap-1" : "mt-1.5")}
        />
      </div>
    </div>
  );
}
