"use client";

import { ResortCatalogPanelHeader } from "@/components/marketing/ResortCatalogPanelHeader";
import { DismissibleModalShell } from "@/components/ui/DismissibleModalShell";
import type { PublicResortListItem } from "@/lib/api/public";
import { formatPhp } from "@/lib/formatPhp";
import { guestDisplayPriceFrom } from "@/lib/guestRoomPricing";
import { MARKETING_MODAL_PANEL_MAX_H_MD, MARKETING_MODAL_Z } from "@/lib/marketingModalLayout";
import { cn } from "@/lib/utils";
import { ExternalLink, MapPin, Phone } from "lucide-react";
import Link from "next/link";

type Props = {
  resort: PublicResortListItem;
  open: boolean;
  onClose: () => void;
};

const modalPrimaryCtaClass = cn(
  "flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold",
  "border-0 bg-gradient-to-r from-clOcean to-clTeal text-white shadow-cl-btn",
  "transition-[transform,color,background-color,box-shadow] duration-150",
  "hover:from-clOceanHover hover:to-clOcean hover:shadow-cl-btn",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clOcean/60 focus-visible:ring-offset-2",
  "active:scale-[0.985]",
);

export function ResortWebsitePreviewModal({ resort, open, onClose }: Props) {
  if (!open) return null;

  const websiteHref = resort.slug ? `/resort/${encodeURIComponent(resort.slug)}` : `/resorts/${resort.id}`;
  const hasDedicatedSite = Boolean(resort.slug);

  return (
    <DismissibleModalShell
      open={open}
      onClose={onClose}
      zIndexClass={MARKETING_MODAL_Z}
      backdropClassName="bg-[#0d1f3c]/55 backdrop-blur-[3px]"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="resort-website-modal-title"
        className={cn(
          "pointer-events-auto flex w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-zinc-200/90 bg-white shadow-2xl sm:rounded-2xl",
          MARKETING_MODAL_PANEL_MAX_H_MD,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <ResortCatalogPanelHeader
          resort={resort}
          onClose={onClose}
          titleId="resort-website-modal-title"
        />

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4 text-sm text-zinc-600">
          {resort.description ? (
            <p className="line-clamp-5 leading-relaxed">{resort.description}</p>
          ) : (
            <p className="text-zinc-500">Visit this resort&apos;s dedicated booking page on Anti-Scam PH.</p>
          )}
          {resort.address ? (
            <p className="flex items-start gap-1.5 text-xs">
              <MapPin size={13} className="mt-0.5 shrink-0 text-clOcean" aria-hidden />
              {resort.address}
            </p>
          ) : null}
          {resort.contactNumber ? (
            <p className="flex items-center gap-1.5 text-xs">
              <Phone size={13} className="shrink-0 text-clOcean" aria-hidden />
              <a href={`tel:${resort.contactNumber}`} className="font-medium text-clOcean hover:underline">
                {resort.contactNumber}
              </a>
            </p>
          ) : null}
          {resort.priceFrom != null && resort.priceFrom > 0 ? (
            <p className="rounded-lg bg-sky-50 px-3 py-2 text-center text-sm font-semibold text-[#0d1f3c]">
              Stays from {formatPhp(guestDisplayPriceFrom(resort.priceFrom))} / night
              <span className="mt-0.5 block text-[11px] font-normal text-zinc-500">
                Reservation fee included in rate shown; room balance due at check-in
              </span>
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-zinc-100 bg-zinc-50/80 px-5 py-3">
          {hasDedicatedSite ? (
            <Link
              href={websiteHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className={modalPrimaryCtaClass}
            >
              <ExternalLink size={16} className="shrink-0 opacity-90" aria-hidden />
              Open resort website
            </Link>
          ) : (
            <Link href={websiteHref} onClick={onClose} className={modalPrimaryCtaClass}>
              View resort on Anti-Scam PH
            </Link>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-full border border-zinc-200 bg-white py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Close
          </button>
        </div>
      </div>
    </DismissibleModalShell>
  );
}
