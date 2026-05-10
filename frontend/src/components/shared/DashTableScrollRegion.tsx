import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type DashTableScrollRegionProps = {
  children: ReactNode;
  /** Accessible name for horizontal scroll area */
  label?: string;
  className?: string;
};

/** Same horizontal-scroll semantics as `DataTable` — use around raw `<table className="dash-table">`. */
export default function DashTableScrollRegion({
  children,
  label = "Data table — swipe sideways to see all columns",
  className,
}: DashTableScrollRegionProps) {
  return (
    <div
      role="region"
      aria-label={label}
      className={cn(
        "dash-table-scroll-region overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]",
        className,
      )}
    >
      {children}
    </div>
  );
}
