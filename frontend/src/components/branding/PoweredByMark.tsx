"use client";

import { BrandWordmark } from "@/components/branding/BrandWordmark";
import { publicAssets } from "@/lib/content/publicAssets";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

type PoweredByMarkProps = {
  compact?: boolean;
  className?: string;
  version?: string;
  tone?: "light" | "dark";
  /** When false, omits the operator logo image (wording can still appear). */
  showOperatorLogo?: boolean;
  /**
   * `stack` — vertical on narrow widths so copy + version pill never collide (dashboard footer).
   * `inline` — single wrapping row (marketing/footer rails).
   */
  variant?: "inline" | "stack";
};

export default function PoweredByMark({
  compact = false,
  className = "",
  version,
  tone = "light",
  showOperatorLogo = true,
  variant = "inline",
}: PoweredByMarkProps) {
  const baseText = tone === "light" ? "text-white/55" : "text-zinc-500";
  const linkText = tone === "light" ? "text-white/75 hover:text-white" : "text-zinc-700 hover:text-zinc-900";
  const badgeTone =
    tone === "light"
      ? "border-white/20 text-white/45"
      : "border-zinc-300 text-zinc-500";

  const layoutCls =
    variant === "stack"
      ? "flex w-full max-w-none flex-col items-center gap-3 text-center text-xs leading-snug sm:inline-flex sm:w-auto sm:max-w-xl sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-2 sm:text-left"
      : "inline-flex max-w-xl flex-wrap items-center gap-2 text-xs leading-snug";

  return (
    <div className={cn(layoutCls, baseText, className)}>
      {showOperatorLogo ? (
        <Image
          src={publicAssets.branding.rising2Brothers}
          alt="The Rising 2 Brothers OPC"
          width={compact ? 22 : 28}
          height={compact ? 22 : 28}
          unoptimized
          className="shrink-0 rounded-sm border border-black/5 bg-white object-contain p-0.5"
        />
      ) : null}
      <span className={cn("max-w-prose", variant === "stack" && "mx-auto sm:mx-0")}>
        <BrandWordmark tone={tone === "light" ? "onDark" : "onLight"} size="xs" className="mr-1 inline" /> is a product
        and service operated by{" "}
        <Link
          href="/"
          className={cn(
            "font-semibold underline-offset-2 [touch-action:manipulation] hover:underline",
            variant === "stack"
              ? "inline py-0.5"
              : "inline-flex min-h-11 items-center sm:min-h-0",
            linkText,
          )}
        >
          The Rising 2 Brothers OPC
        </Link>
        .
      </span>
      {version ? (
        <span
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-full border px-3 py-1 text-[11px] font-semibold sm:min-h-0 sm:px-2 sm:py-0.5 sm:text-[10px]",
            variant === "stack" ? "min-h-10 sm:min-h-0" : "min-h-9 sm:min-h-0",
            badgeTone,
          )}
        >
          {version}
        </span>
      ) : null}
    </div>
  );
}
