"use client";

import { appLabel } from "@/components/shared/form/formStyles";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  icon?: LucideIcon;
  htmlFor?: string;
  className?: string;
  required?: boolean;
};

export function FieldLabel({ children, icon: Icon, htmlFor, className, required }: Props) {
  return (
    <label htmlFor={htmlFor} className={cn(appLabel, "flex items-center gap-1.5", className)}>
      {Icon ? <Icon className="h-3.5 w-3.5 shrink-0 text-zinc-400" strokeWidth={1.75} aria-hidden /> : null}
      {children}
      {required ? (
        <span className="text-rose-500" aria-hidden>
          *
        </span>
      ) : null}
    </label>
  );
}
