import { BrandWordmark } from "@/components/branding/BrandWordmark";
import {
  AboutCornerRibbon,
  AboutIconHalo,
  AboutShieldArc,
  AboutStampArc,
  AboutTilePillar,
  AboutWaveDivider,
  type AboutPillarAccent,
} from "@/components/marketing/AboutPageAccents";
import { aboutVerificationMethods } from "@/lib/aboutPageContent";
import { cn } from "@/lib/utils";
import {
  BadgeCheck,
  Shield,
  ShieldCheck,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";

const LOGO_WATERMARK = "/mainlogo.png";

type WatermarkSize = "sm" | "md" | "lg";
type WatermarkPosition = "bottom-right" | "center-right";

const watermarkSizeClass: Record<WatermarkSize, string> = {
  sm: "h-[7.5rem] w-[7.5rem] md:h-[8.5rem] md:w-[8.5rem]",
  md: "h-[9.5rem] w-[9.5rem] md:h-[11rem] md:w-[11rem]",
  lg: "h-[11rem] w-[11rem] md:h-[14rem] md:w-[14rem]",
};

const watermarkPositionClass: Record<WatermarkPosition, string> = {
  "bottom-right": "-bottom-[18%] -right-[10%] md:-bottom-[14%] md:-right-[6%]",
  "center-right": "top-1/2 -right-[8%] -translate-y-1/2 md:-right-[4%]",
};

/** Single faint mainlogo watermark (not tiled). */
export function AboutBrandWatermarkBg({
  children,
  className,
  variant = "light",
  size = "md",
  position = "bottom-right",
}: {
  children: ReactNode;
  className?: string;
  variant?: "light" | "dark";
  size?: WatermarkSize;
  position?: WatermarkPosition;
}) {
  const logoOpacity = variant === "dark" ? "opacity-[0.08]" : "opacity-[0.05]";

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <Image
        src={LOGO_WATERMARK}
        alt=""
        width={320}
        height={320}
        className={cn(
          "pointer-events-none absolute z-0 object-contain select-none",
          watermarkSizeClass[size],
          watermarkPositionClass[position],
          logoOpacity,
        )}
        aria-hidden
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-[1]",
          variant === "dark"
            ? "bg-gradient-to-r from-[#0d1f3c]/95 via-[#0d1f3c]/88 to-[#0d1f3c]/55"
            : "bg-gradient-to-r from-white/97 via-white/94 to-white/75",
        )}
        aria-hidden
      />
      <div className="relative z-[2]">{children}</div>
    </div>
  );
}

export const AboutBrandPatternBg = AboutBrandWatermarkBg;

/** Twin rules — consistent section rhythm across the page. */
export function AboutSectionBreak({
  label,
  variant = "lines",
}: {
  label?: string;
  variant?: "lines" | "wave";
}) {
  if (variant === "wave") {
    return <AboutWaveDivider label={label} />;
  }

  return (
    <div className="flex flex-col items-center gap-1.5 py-1" role="presentation">
      <div className="h-px w-full max-w-4xl bg-gradient-to-r from-transparent via-clOcean/40 to-transparent" />
      <div className="h-px w-full max-w-3xl bg-gradient-to-r from-transparent via-clTeal/30 to-transparent" />
      {label ? (
        <p className="pt-1 text-center text-[10px] font-bold uppercase tracking-[0.22em] text-clOcean/75">
          {label}
        </p>
      ) : null}
    </div>
  );
}

export { AboutContentBand } from "@/components/marketing/AboutPageAccents";

export function AboutIconBadge({
  icon: Icon,
  dark = false,
}: {
  icon: LucideIcon;
  dark?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border shadow-sm sm:h-11 sm:w-11 sm:rounded-xl",
        dark
          ? "border-white/20 bg-white/10 text-white"
          : "border-clOcean/20 bg-white text-clOcean",
      )}
    >
      <Icon className="h-[18px] w-[18px] sm:h-[22px] sm:w-[22px]" strokeWidth={1.75} aria-hidden />
    </span>
  );
}

export function AboutCompactList({
  items,
  dark = false,
  columns = 1,
}: {
  items: readonly string[];
  dark?: boolean;
  columns?: 1 | 2;
}) {
  return (
    <ul
      className={cn(
        "mt-3 gap-x-3 gap-y-1.5",
        columns === 2 ? "grid grid-cols-1 gap-y-1 sm:grid-cols-2" : "space-y-1.5",
      )}
    >
      {items.map((item) => (
        <li
          key={item}
          className={cn(
            "flex items-start gap-1.5 text-[11px] leading-snug sm:gap-2 sm:text-[13px]",
            dark ? "text-white/88" : "text-zinc-600",
          )}
        >
          <span
            className={cn(
              "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
              dark ? "bg-amber-300/90" : "bg-clTeal",
            )}
            aria-hidden
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function AboutStatusChips({ items, dark = false }: { items: readonly string[]; dark?: boolean }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-1.5">
      {items.map((item) => (
        <li
          key={item}
          className={cn(
            "rounded-full border px-2.5 py-1 text-[11px] font-semibold",
            dark
              ? "border-white/25 bg-white/10 text-white"
              : "border-clOcean/25 bg-clOcean/8 text-clOcean",
          )}
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

type AboutTileProps = {
  eyebrow: string;
  title: string;
  icon: LucideIcon;
  children: ReactNode;
  tone?: "light" | "sand" | "navy";
  branded?: boolean;
  className?: string;
  span?: 1 | 2;
  /** Span both columns at all breakpoints (e.g. lone commitment tile). */
  fullRow?: boolean;
  pillar?: AboutPillarAccent | null;
  cornerRibbon?: boolean;
  shieldArc?: boolean;
  stampArc?: boolean;
  iconHalo?: boolean;
};

export function AboutTileGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-2 gap-3 sm:gap-4 lg:gap-5", className)}>{children}</div>;
}

export function AboutFeatureTile({
  eyebrow,
  title,
  icon,
  children,
  tone = "light",
  branded = false,
  className,
  span = 1,
  fullRow = false,
  pillar = null,
  cornerRibbon = false,
  shieldArc = false,
  stampArc = false,
  iconHalo = false,
}: AboutTileProps) {
  const shell =
    tone === "navy"
      ? "border-white/12 bg-gradient-to-br from-[#0d1f3c] via-[#102a4d] to-[#0a1628] text-white shadow-cl-card"
      : tone === "sand"
        ? "border-clSeafoam/65 bg-gradient-to-br from-white via-clSand/30 to-clSeafoam/15 shadow-cl-card"
        : "border-clSeafoam/55 bg-white shadow-cl-card";

  const showRibbon = cornerRibbon || branded;

  const inner = (
    <article
      className={cn(
        "relative flex h-full min-h-0 flex-col overflow-hidden rounded-xl border p-3.5 sm:min-h-[220px] sm:rounded-2xl sm:p-5 md:min-h-[240px] md:p-6",
        shell,
        className,
      )}
    >
      {pillar ? <AboutTilePillar accent={pillar} /> : null}
      {showRibbon ? <AboutCornerRibbon dark={tone === "navy"} /> : null}
      {shieldArc ? <AboutShieldArc dark={tone === "navy"} /> : null}
      {stampArc ? <AboutStampArc /> : null}
      <div className="relative z-[1] flex items-start gap-2 sm:gap-3">
        <div className="relative shrink-0">
          {iconHalo ? <AboutIconHalo dark={tone === "navy"} /> : null}
          <AboutIconBadge icon={icon} dark={tone === "navy"} />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-[9px] font-bold uppercase tracking-[0.16em] sm:text-[10px] sm:tracking-[0.2em]",
              tone === "navy" ? "text-amber-200/90" : "text-clOcean",
            )}
          >
            {eyebrow}
          </p>
          <h2
            className={cn(
              "mt-0.5 font-heading text-sm font-bold leading-snug sm:mt-1 sm:text-xl sm:leading-tight md:text-[1.35rem]",
              tone === "navy" ? "text-white" : "text-[#0d1f3c]",
            )}
          >
            {title}
          </h2>
        </div>
      </div>
      <div
        className={cn(
          "mt-2 flex-1 text-xs leading-relaxed sm:mt-3 sm:text-sm [&_.text-xs]:text-[10px] sm:[&_.text-xs]:text-xs",
          tone === "navy" ? "text-white/85" : "text-zinc-600",
        )}
      >
        {children}
      </div>
    </article>
  );

  const wrapped = branded ? (
    <AboutBrandWatermarkBg className="h-full rounded-xl sm:rounded-2xl" size="sm" position="bottom-right">
      {inner}
    </AboutBrandWatermarkBg>
  ) : (
    inner
  );

  return (
    <div className={cn(fullRow && "col-span-2", span === 2 && !fullRow && "sm:col-span-2")}>
      {wrapped}
    </div>
  );
}

const verificationIcons: LucideIcon[] = [Video, ShieldCheck, BadgeCheck, Users];

export function AboutIntroHero() {
  return (
    <AboutBrandWatermarkBg
      className="rounded-3xl border border-clSeafoam/70 shadow-cl-card"
      size="lg"
      position="center-right"
    >
      <section className="p-6 md:p-9 lg:p-10">
        <span className="cl-section-eyebrow mb-3 inline-flex">About us</span>
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-clOcean">About Anti-ScamPH</p>
        <h1 className="mt-2 max-w-4xl font-heading text-[1.65rem] font-bold leading-[1.15] text-[#0d1f3c] md:text-4xl lg:text-[2.5rem]">
          The First Filipino-Owned Resort Verification &amp; Booking Protection Platform
        </h1>
        <p className="mt-4 max-w-3xl text-base font-medium leading-relaxed text-zinc-700 md:text-lg">
          Safer stays. Verified resorts. Scam-free bookings — built for guests and legitimate Philippine hospitality
          operators.
        </p>
        <div className="mt-5 max-w-3xl space-y-3 text-sm leading-relaxed text-zinc-600 md:text-[15px]">
          <p>
            <BrandWordmark tone="onLight" size="xs" className="inline" /> eliminates fake listings, fraudulent
            staycation ads, double bookings, and online reservation scams — with a{" "}
            <strong className="font-semibold text-zinc-800">verification-first</strong> listing process.
          </p>
        </div>

        <AboutSectionBreak label="Verification pipeline" />

        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {aboutVerificationMethods.map((label, i) => {
            const Icon = verificationIcons[i] ?? ShieldCheck;
            return (
              <li
                key={label}
                className="flex items-center gap-3 rounded-xl border border-clSeafoam/70 bg-white/90 px-3 py-3 shadow-sm backdrop-blur-sm"
              >
                <AboutIconBadge icon={Icon} />
                <span className="text-xs font-semibold leading-snug text-zinc-800">{label}</span>
              </li>
            );
          })}
        </ul>

        <p className="mt-5 rounded-xl border border-clOcean/25 bg-clOcean/10 px-4 py-3 text-center text-sm font-semibold text-clOcean md:text-base">
          Trust comes first — before any booking goes live.
        </p>
      </section>
    </AboutBrandWatermarkBg>
  );
}

export function AboutClosingBanner() {
  return (
    <AboutBrandWatermarkBg
      className="rounded-3xl border border-white/15 shadow-cl-card"
      variant="dark"
      size="md"
      position="bottom-right"
    >
      <section className="relative bg-gradient-to-br from-[#0d1f3c] via-[#102a4d] to-[#0a1628] p-6 text-white md:p-9">
        <div className="flex flex-col items-center gap-4 text-center md:flex-row md:text-left">
          <Image src={LOGO_WATERMARK} alt="" width={72} height={72} className="relative z-[3] h-14 w-14 shrink-0 object-contain md:h-16 md:w-16" />
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-200/90">Our commitment</p>
            <p className="mt-2 font-heading text-2xl font-bold leading-tight md:text-3xl">
              Booking safety isn&apos;t a feature — it&apos;s the foundation of trust.
            </p>
          </div>
        </div>
      </section>
    </AboutBrandWatermarkBg>
  );
}
