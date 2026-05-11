import { cn } from "@/lib/utils";
import type { ElementType } from "react";

export type BrandWordmarkTone = "onLight" | "onDark";

export type BrandWordmarkSize = "2xs" | "xs" | "sm" | "md" | "lg" | "xl";

type BrandWordmarkProps = {
  tone?: BrandWordmarkTone;
  size?: BrandWordmarkSize;
  /** Second line: “Verified Resort Platform” */
  subtitle?: boolean;
  /** When `subtitle` is set, hide subtitle below `sm` (nav header density). */
  subtitleSmOnly?: boolean;
  className?: string;
  as?: ElementType;
  /** Poppins (`font-pop`) instead of nav Montserrat — use with landing / marketing typography */
  displayHeading?: boolean;
};

const titleSize: Record<BrandWordmarkSize, string> = {
  "2xs": "text-[10px] tracking-[0.1em]",
  xs: "text-[11px] tracking-[0.11em]",
  sm: "text-sm tracking-[0.12em]",
  md: "text-base tracking-[0.13em]",
  lg: "text-lg tracking-[0.14em]",
  xl: "text-xl tracking-[0.14em] sm:text-2xl sm:tracking-[0.15em]",
};

const subtitleSize: Record<BrandWordmarkSize, string> = {
  "2xs": "text-[8px] tracking-[0.16em]",
  xs: "text-[9px] tracking-[0.17em]",
  sm: "text-[10px] tracking-[0.18em]",
  md: "text-[11px] tracking-[0.18em]",
  lg: "text-xs tracking-[0.19em]",
  xl: "text-xs tracking-[0.2em] sm:text-sm",
};

/**
 * Product wordmark: **Anti-** / **Scam** / **PH** (navy · alert red · navy), uppercase.
 * Default: Montserrat (`font-nav`). With `displayHeading`, Poppins (`font-pop`) for landing typography.
 */
export function BrandWordmark({
  tone = "onLight",
  size = "sm",
  subtitle = false,
  subtitleSmOnly = false,
  className,
  as: Comp = "span",
  displayHeading = false,
}: BrandWordmarkProps) {
  const navy = tone === "onLight" ? "text-navy" : "text-white";
  const subColor = tone === "onLight" ? "text-zinc-500" : "text-white/65";

  return (
    <Comp
      className={cn(
        subtitle ? "inline-flex flex-col items-start" : "inline align-middle",
        !subtitle && "max-w-full",
        className,
      )}
    >
      <span
        className={cn(
          displayHeading ? "font-pop font-extrabold uppercase leading-tight" : "font-nav font-extrabold uppercase leading-tight",
          titleSize[size],
        )}
      >
        <span className={navy}>Anti-</span>
        <span className="text-clScamWordmark">Scam</span>
        <span className={navy}> PH</span>
      </span>
      {subtitle ? (
        <span
          className={cn(
            displayHeading ? "font-pop font-semibold uppercase leading-tight" : "font-nav font-semibold uppercase leading-tight",
            subtitleSize[size],
            subColor,
            subtitleSmOnly && "hidden sm:block",
          )}
        >
          Verified Resort Platform
        </span>
      ) : null}
    </Comp>
  );
}
