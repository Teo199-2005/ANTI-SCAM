import {
  Award,
  CalendarCheck2,
  MessageSquareOff,
  Settings2,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { icon: Settings2,       label: "Simplify property management" },
  { icon: Award,           label: "Legitimize your resort business" },
  { icon: CalendarCheck2,  label: "No more double bookings" },
  { icon: Zap,             label: "Easy booking" },
  { icon: MessageSquareOff, label: "No redundant inquiries" },
] as const;

type OwnerValuePropsStripProps = {
  /** Dark background (e.g. deep ocean strip) — light text and stronger glass */
  variant?: "light" | "dark";
  className?: string;
};

export default function OwnerValuePropsStrip({ variant = "light", className }: OwnerValuePropsStripProps) {
  const isDark = variant === "dark";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-2 sm:gap-3",
        className
      )}
      role="list"
      aria-label="Platform benefits for resort owners"
    >
      {items.map(({ icon: Icon, label }) => (
        <div
          key={label}
          role="listitem"
          className={cn(
            "inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-2 text-left text-xs font-semibold shadow-sm backdrop-blur-md sm:text-sm transition-colors duration-150",
            isDark
              ? "border-white/25 bg-white/10 text-white/95 hover:bg-white/18"
              : "border-clSeafoam/70 bg-white/60 text-zinc-800 hover:bg-clSeafoam/40"
          )}
        >
          <span
            className={cn(
              "inline-flex shrink-0 rounded-full border p-1.5",
              isDark
                ? "border-white/30 bg-white/15 text-white"
                : "border-clSeafoam bg-gradient-to-br from-clSeafoam to-white text-clOcean"
            )}
          >
            <Icon size={14} className="shrink-0" aria-hidden />
          </span>
          <span className="leading-snug">{label}</span>
        </div>
      ))}
    </div>
  );
}
