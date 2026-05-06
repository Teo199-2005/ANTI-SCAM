import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  /**
   * primary  — Anti-Scam PH crimson gradient (marketing CTAs)
   * outline  — frosted glass with brand border
   * soft     — very light glass
   */
  variant?: "primary" | "outline" | "soft";
};

export default function Button({ className, variant = "primary", ...props }: Props) {
  const style =
    variant === "primary"
      ? "border-0 bg-gradient-to-r from-clOcean to-clTeal text-white shadow-cl-btn hover:from-clOceanHover hover:to-clOcean hover:shadow-cl-btn focus-visible:ring-clOcean/60"
      : variant === "outline"
        ? "border border-clOcean/25 bg-white/60 text-clOcean shadow-sm backdrop-blur-md hover:bg-clSeafoam/60 hover:border-clTeal/45 focus-visible:ring-clOcean/50"
        : "border border-clSeafoam/70 bg-white/40 text-zinc-900 shadow-sm backdrop-blur-md hover:bg-white/60 focus-visible:ring-clOcean/40";

  return (
    <button
      suppressHydrationWarning
      className={cn(
        "rounded-full px-5 py-2.5 text-sm font-semibold",
        "transition-[transform,color,background-color,box-shadow,opacity] duration-150",
        "active:scale-[0.985] disabled:pointer-events-none disabled:opacity-55",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        style,
        className
      )}
      {...props}
    />
  );
}
