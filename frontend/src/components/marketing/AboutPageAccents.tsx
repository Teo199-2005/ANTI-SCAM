import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type AboutBandAccent = "platform" | "guests" | "advocacy";

const stripeConfig: Record<
  AboutBandAccent,
  { bar: string; position: string; h: string; w: string; rotate: string }
> = {
  platform: {
    bar: "bg-clTeal",
    position: "bottom-2 -left-3 md:bottom-4 md:left-0",
    h: "h-64 md:h-72",
    w: "w-6 md:w-7",
    rotate: "-rotate-[28deg]",
  },
  guests: {
    bar: "bg-primaryBlue",
    position: "top-4 -right-2 md:top-8 md:-right-1",
    h: "h-60 md:h-72",
    w: "w-6 md:w-7",
    rotate: "-rotate-[28deg]",
  },
  advocacy: {
    bar: "bg-amber-400",
    position: "bottom-4 -right-2 md:bottom-6 md:right-0",
    h: "h-64 md:h-72",
    w: "w-6 md:w-7",
    rotate: "-rotate-[28deg]",
  },
};

/** One slanted stripe per content band (like Visionaries, but single + band color). */
export function AboutBandDiagonalStripe({ accent }: { accent: AboutBandAccent }) {
  const c = stripeConfig[accent];
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute z-0 hidden sm:block", c.position)}
    >
      <div className={cn("opacity-85 shadow-md", c.rotate)}>
        <span className={cn("block rounded-full", c.h, c.w, c.bar)} />
      </div>
    </div>
  );
}

/** Wraps a 2×2 tile group + band-level stripe. */
export function AboutContentBand({
  accent,
  children,
  className,
  ecosystemBg = false,
}: {
  accent: AboutBandAccent;
  children: ReactNode;
  className?: string;
  ecosystemBg?: boolean;
}) {
  return (
    <div className={cn("relative", className)}>
      <AboutBandDiagonalStripe accent={accent} />
      {ecosystemBg ? <AboutEcosystemMesh /> : null}
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}

/** Light connected dots — LGU / ecosystem band only. */
function AboutEcosystemMesh() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-[0.12]"
      viewBox="0 0 400 200"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <circle cx="60" cy="40" r="3" fill="#1a4d94" />
      <circle cx="180" cy="90" r="3" fill="#1a4d94" />
      <circle cx="320" cy="50" r="3" fill="#1a4d94" />
      <circle cx="100" cy="150" r="3" fill="#0d9488" />
      <circle cx="280" cy="140" r="3" fill="#0d9488" />
      <path
        d="M60 40 L180 90 L320 50 M180 90 L100 150 L280 140"
        stroke="#1a4d94"
        strokeWidth="1"
        fill="none"
      />
    </svg>
  );
}

/** Twin ocean/teal waves instead of flat double rules. */
export function AboutWaveDivider({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-2" role="presentation">
      <svg
        viewBox="0 0 1200 28"
        className="h-7 w-full max-w-4xl text-clOcean/35"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d="M0 14 C200 6 400 22 600 14 S1000 6 1200 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M0 20 C200 28 400 12 600 20 S1000 28 1200 20"
          fill="none"
          className="text-clTeal/50"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
      {label ? (
        <p className="text-center text-[10px] font-bold uppercase tracking-[0.22em] text-clOcean/75">
          {label}
        </p>
      ) : null}
    </div>
  );
}

export type AboutPillarAccent = "teal" | "ocean" | "gold";

const pillarTopAccent: Record<AboutPillarAccent, { line: string; glow: string; wash: string }> = {
  teal: {
    line: "bg-gradient-to-r from-transparent via-clTeal/40 to-transparent",
    glow: "bg-gradient-to-b from-clTeal/14 via-clTeal/4 to-transparent",
    wash: "bg-clTeal/12",
  },
  ocean: {
    line: "bg-gradient-to-r from-transparent via-primaryBlue/40 to-transparent",
    glow: "bg-gradient-to-b from-primaryBlue/14 via-primaryBlue/4 to-transparent",
    wash: "bg-primaryBlue/12",
  },
  gold: {
    line: "bg-gradient-to-r from-transparent via-amber-400/45 to-transparent",
    glow: "bg-gradient-to-b from-amber-400/16 via-amber-400/5 to-transparent",
    wash: "bg-amber-400/14",
  },
};

/** Soft top edge — faded line + downward color wash (not a solid border). */
export function AboutTilePillar({ accent }: { accent: AboutPillarAccent }) {
  const s = pillarTopAccent[accent];
  return (
    <>
      <span
        aria-hidden
        className={cn("pointer-events-none absolute inset-x-6 top-0 z-0 h-7 blur-xl opacity-60", s.wash)}
      />
      <span
        aria-hidden
        className={cn("pointer-events-none absolute inset-x-0 top-0 z-[1] h-12", s.glow)}
      />
      <span
        aria-hidden
        className={cn("pointer-events-none absolute inset-x-0 top-0 z-[2] h-px", s.line)}
      />
    </>
  );
}

/** Certificate-style folded corner on branded tiles. */
export function AboutCornerRibbon({ dark = false }: { dark?: boolean }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute right-0 top-0 z-[2] h-10 w-10 overflow-hidden rounded-tr-xl sm:h-14 sm:w-14 sm:rounded-tr-2xl"
    >
      <span
        className={cn(
          "absolute -right-6 top-3 block h-8 w-14 rotate-45",
          dark ? "bg-amber-400/90" : "bg-clOcean",
        )}
      />
      <span
        className={cn(
          "absolute right-1 top-1 block h-8 w-8 rounded-tr-xl border-r-2 border-t-2",
          dark ? "border-amber-200/50" : "border-white/40",
        )}
      />
    </span>
  );
}

/** Partial ring behind trust-focused tiles. */
export function AboutShieldArc({ dark = false }: { dark?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute -right-10 -top-10 z-0 h-36 w-36 rounded-full border-[3px] border-b-transparent border-r-transparent",
        dark ? "border-amber-300/25" : "border-clOcean/20",
      )}
    />
  );
}

/** Stamp arc for navy commitment / vision tiles. */
export function AboutStampArc() {
  return (
    <>
      <span
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 z-0 h-40 w-40 rounded-full border-2 border-dashed border-amber-300/30"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-6 z-0 h-28 w-28 rounded-full border border-amber-400/20"
      />
    </>
  );
}

/** Subtle ring behind section icons. */
export function AboutIconHalo({ dark = false }: { dark?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute -inset-1.5 rounded-2xl bg-gradient-to-br opacity-60",
        dark
          ? "from-amber-300/20 via-transparent to-transparent"
          : "from-clTeal/15 via-clOcean/10 to-transparent",
      )}
    />
  );
}
