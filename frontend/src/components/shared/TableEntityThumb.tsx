"use client";

import { laravelPublicUrl } from "@/lib/publicAsset";
import { cn } from "@/lib/utils";
import { Building2 } from "lucide-react";
import Image from "next/image";

type Props = {
  imageUrl?: string | null;
  name: string;
  kind: "person" | "resort";
  size?: "sm" | "md";
  className?: string;
};

const sizeClass: Record<NonNullable<Props["size"]>, string> = {
  sm: "h-9 w-9",
  md: "h-10 w-10",
};

function initialsFromName(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

/** Small logo or profile photo for admin data tables. */
export function TableEntityThumb({ imageUrl, name, kind, size = "sm", className }: Props) {
  const src = imageUrl ? laravelPublicUrl(imageUrl) : "";

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-lg bg-white ring-1",
        sizeClass[size],
        kind === "resort" ? "ring-emerald-200/70" : "ring-skyBlue/25",
        className,
      )}
      title={name}
    >
      {src ? (
        <Image
          src={src}
          alt=""
          fill
          className={kind === "resort" ? "object-contain p-0.5" : "object-cover"}
          sizes="40px"
          unoptimized
        />
      ) : kind === "resort" ? (
        <div className="flex h-full w-full items-center justify-center bg-softGray/80 text-zinc-400">
          <Building2 size={size === "sm" ? 16 : 18} aria-hidden />
        </div>
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slateBlue to-navy text-[10px] font-bold text-white">
          {initialsFromName(name)}
        </div>
      )}
    </div>
  );
}
