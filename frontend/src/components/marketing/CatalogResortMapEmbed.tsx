"use client";

import type { PublicResortMap } from "@/lib/api/public";
import { cn } from "@/lib/utils";
import { ExternalLink, MapPin } from "lucide-react";

type Props = {
  resortName: string;
  map: PublicResortMap;
  className?: string;
  /** Shorter iframe for modals */
  compact?: boolean;
};

/** Google Maps embed for catalog modals and previews. */
export function CatalogResortMapEmbed({ resortName, map, className, compact = false }: Props) {
  const embedUrl = map.embedUrl?.trim();
  if (!embedUrl) return null;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-sm",
        className,
      )}
    >
      {map.address ? (
        <div className="flex items-start gap-1.5 border-b border-zinc-100 bg-zinc-50/90 px-3 py-2">
          <MapPin size={13} className="mt-0.5 shrink-0 text-clOcean" aria-hidden />
          <p className="text-xs font-medium leading-snug text-zinc-700">{map.address}</p>
        </div>
      ) : null}
      <div className={cn("relative w-full bg-zinc-100", compact ? "h-40 sm:h-44" : "h-52 sm:h-56")}>
        <iframe
          src={embedUrl}
          className="absolute inset-0 h-full w-full border-0"
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={`Map for ${resortName}`}
        />
      </div>
      {map.searchUrl ? (
        <div className="border-t border-zinc-100 bg-zinc-50/80 px-3 py-2">
          <a
            href={map.searchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-clOcean underline-offset-2 hover:underline"
          >
            <ExternalLink size={12} className="opacity-80" aria-hidden />
            Open in Google Maps
          </a>
        </div>
      ) : null}
    </div>
  );
}
