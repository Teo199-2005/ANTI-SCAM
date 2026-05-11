import { BrandWordmark } from "@/components/branding/BrandWordmark";
import { cn } from "@/lib/utils";

type NavBrandWordmarkProps = {
  /** Larger tracking/title in drawer header */
  size?: "header" | "drawer";
  className?: string;
};

/**
 * Navbar + mobile drawer lockup (title + “Verified Resort Platform”).
 */
export function NavBrandWordmark({ size = "header", className }: NavBrandWordmarkProps) {
  return (
    <BrandWordmark
      tone="onLight"
      size={size === "drawer" ? "md" : "xs"}
      subtitle
      subtitleSmOnly={size === "header"}
      className={cn("min-w-0", className)}
    />
  );
}
