import { cn } from "@/lib/utils";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

export type DashCardProps = ComponentPropsWithoutRef<"div"> & {
  children: ReactNode;
  /** `interactive` adds hover elevation for clickable cards */
  variant?: "default" | "interactive";
  /** No outer shadow — for nesting inside another card */
  flat?: boolean;
};

/**
 * Standard dashboard surface (Layer 2). All white panels use this — never raw `bg-white` + inline shadow.
 */
export default function DashCard({
  className,
  children,
  variant = "default",
  flat = false,
  ...rest
}: DashCardProps) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-2xl",
        flat
          ? "border border-softBorderStrong/80 bg-softGray shadow-none"
          : "border border-white/55 bg-gradient-to-b from-softCard via-softCard to-metalFace shadow-metallic-panel",
        !flat &&
          variant === "interactive" &&
          "cursor-pointer transition-[box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-metallic-panel-hover motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
