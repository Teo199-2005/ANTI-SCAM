"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

const SIZE_CLASS = {
  xs: "h-3 w-3",
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
  xl: "h-6 w-6",
} as const;

type Props = {
  icon: LucideIcon;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
  strokeWidth?: number;
};

/** Low-contrast Lucide icon for wizard UI (labels, nav, section headers). */
export function WizardSubtleIcon({ icon: Icon, size = "md", className, strokeWidth = 1.75 }: Props) {
  return (
    <Icon
      className={cn(SIZE_CLASS[size], "shrink-0 text-clOcean/75", className)}
      strokeWidth={strokeWidth}
      aria-hidden
    />
  );
}
