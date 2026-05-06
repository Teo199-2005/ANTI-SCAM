import { kpiTone, rgb, type KpiIconTone } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { LucideIcon, TrendingDown, TrendingUp } from "lucide-react";
import type { CSSProperties } from "react";

export type IconTone = KpiIconTone;

type StatCardProps = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  iconTone?: IconTone;
  trend?: "up" | "down";
  trendValue?: string;
  subtitle?: string;
  /** Tighter padding + type scale for 2-column mobile grids */
  compact?: boolean;
};

function shadowForRgb(rgbStr: string): string {
  return `0 2px 10px rgba(${rgbStr}, 0.12), 0 1px 3px rgba(${rgb.navy}, 0.08)`;
}

function shadowHoverForRgb(rgbStr: string): string {
  return `0 6px 22px rgba(${rgbStr}, 0.22), 0 2px 6px rgba(${rgb.navy}, 0.12)`;
}

export default function StatCard({
  label,
  value,
  icon: Icon,
  iconTone = "blue",
  trend,
  trendValue,
  subtitle,
  compact = false,
}: StatCardProps) {
  const tone = kpiTone[iconTone];
  const resting = shadowForRgb(tone.rgb);
  const hover = shadowHoverForRgb(tone.rgb);

  return (
    <div
      className={cn(
        "relative flex flex-col overflow-hidden rounded-2xl border border-white/40 bg-gradient-to-b from-softCard via-softCard to-metalFace",
        compact ? "gap-2 p-3.5 md:gap-dash-4 md:p-5" : "gap-dash-4 p-5",
        "motion-safe:transition-[box-shadow,transform] motion-safe:duration-200 motion-reduce:transition-none",
        "hover:-translate-y-0.5 motion-reduce:hover:translate-y-0",
        "motion-safe:animate-dash-soft-pop motion-reduce:animate-none",
      )}
      style={{ boxShadow: resting } satisfies CSSProperties}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = hover;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = resting;
      }}
    >
      <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] rounded-t-2xl" style={{ background: tone.accent }} />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{ background: `rgba(${tone.rgb}, 0.05)` }}
      />
      <span aria-hidden className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/45" />


      <div className="relative flex items-start justify-between">
        <div
          className={cn("inline-flex rounded-xl", compact ? "p-2 md:p-3" : "p-3")}
          style={{ background: tone.accent }}
        >
          <Icon
            className={cn("text-white", compact ? "h-4 w-4 md:h-[18px] md:w-[18px]" : "h-[18px] w-[18px]")}
            strokeWidth={2}
            aria-hidden
          />
        </div>

        {trend === "up" ? (
          <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-dash-xs font-semibold"
            style={{ background: `rgba(${tone.rgb}, 0.12)`, color: tone.accent }}
          >
            <TrendingUp size={11} strokeWidth={2} aria-hidden />
            {trendValue ?? "Up"}
          </span>
        ) : trend === "down" ? (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-dsError/10 px-2.5 py-1 text-dash-xs font-semibold text-dsError"
          >
            <TrendingDown size={11} strokeWidth={2} aria-hidden />
            {trendValue ?? "Down"}
          </span>
        ) : null}
      </div>

      <div className="relative min-w-0">
        <p className={cn("font-medium text-zinc-600", compact ? "text-[11px] leading-tight md:text-dash-xs" : "text-dash-xs")}>
          {label}
        </p>
        {subtitle ? (
          <p className={cn("mt-0.5 text-zinc-500", compact ? "text-[10px] md:text-dash-xs" : "text-dash-xs")}>{subtitle}</p>
        ) : null}
        <p
          className={cn(
            "mt-1.5 font-dash font-bold leading-none text-navy",
            compact ? "text-xl md:text-dash-3xl" : "text-dash-3xl",
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
