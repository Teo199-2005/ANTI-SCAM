"use client";

import { laravelPublicUrl } from "@/lib/publicAsset";
import { cn } from "@/lib/utils";
import Image from "next/image";

type Props = {
  logoUrl?: string | null;
  resortName: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
};

const sizeClass: Record<NonNullable<Props["size"]>, string> = {
  xs: "h-10 w-10",
  sm: "h-12 w-12 sm:h-14 sm:w-14",
  md: "h-14 w-14 sm:h-16 sm:w-16",
  lg: "h-16 w-16 sm:h-[4.75rem] sm:w-[4.75rem]",
};

const imageSizes: Record<NonNullable<Props["size"]>, string> = {
  xs: "40px",
  sm: "56px",
  md: "64px",
  lg: "76px",
};

/** Resort logo as a floating top-right watermark — no box, transparent backdrop. */
export function ResortLogoWatermark({ logoUrl, resortName, size = "sm", className }: Props) {
  const src = logoUrl ? laravelPublicUrl(logoUrl) : null;
  if (!src) return null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute right-2.5 top-2.5 z-10 sm:right-3 sm:top-3",
        sizeClass[size],
        className,
      )}
    >
      <Image
        src={src}
        alt=""
        fill
        className="object-contain object-right-top opacity-[0.9] drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
        sizes={imageSizes[size]}
        unoptimized
      />
    </div>
  );
}
