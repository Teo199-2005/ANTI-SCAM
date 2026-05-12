"use client";

/**
 * Public resort landing only (`/resort/[slug]` via `ResortPublicLandingTemplate`).
 * Compact thumb-zone navigation for small screens — hidden from `lg:` where desktop readers use in-page scroll.
 */

import { cn } from "@/lib/utils";
import Link from "next/link";
import { BedDouble, Home, Info, MapPinned } from "lucide-react";

type Props = {
  showMapLink: boolean;
};

const itemClass =
  "flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl border border-white/12 bg-white/[0.07] px-1 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-100/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md transition active:scale-[0.98] hover:border-white/22 hover:bg-white/[0.12]";

export function ResortLandingMobileStickyNav({ showMapLink }: Props) {
  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 lg:hidden"
      aria-label="Quick page sections"
    >
      <div className="pointer-events-auto mx-auto flex max-w-md gap-1.5 rounded-2xl border border-white/15 bg-zinc-950/75 p-1.5 shadow-[0_-8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <Link href="#top" className={cn(itemClass)} scroll={true}>
          <Home className="h-4 w-4 text-amber-200/95" strokeWidth={2} aria-hidden />
          Top
        </Link>
        <Link href="#rooms" className={cn(itemClass)} scroll={true}>
          <BedDouble className="h-4 w-4 text-amber-200/95" strokeWidth={2} aria-hidden />
          Rooms
        </Link>
        <Link href="#info" className={cn(itemClass)} scroll={true}>
          <Info className="h-4 w-4 text-amber-200/95" strokeWidth={2} aria-hidden />
          Info
        </Link>
        {showMapLink ? (
          <Link href="#map" className={cn(itemClass)} scroll={true}>
            <MapPinned className="h-4 w-4 text-amber-200/95" strokeWidth={2} aria-hidden />
            Map
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
