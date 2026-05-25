"use client";

import { appFieldInput } from "@/components/shared/form/formStyles";
import { cn } from "@/lib/utils";
import { Calendar } from "lucide-react";
import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement>;

export function AppDateInput({ className, ...rest }: Props) {
  return (
    <div className="relative">
      <input type="date" className={cn(appFieldInput, "pr-10 [color-scheme:light]", className)} {...rest} />
      <Calendar
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
        strokeWidth={1.75}
        aria-hidden
      />
    </div>
  );
}
