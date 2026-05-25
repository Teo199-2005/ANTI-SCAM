"use client";

import { WizardSubtleIcon } from "@/components/onboarding/WizardSubtleIcon";
import { wizardHint } from "@/components/onboarding/wizardStyles";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  number: number | string;
  title: string;
  description?: string;
  optional?: boolean;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
};

export function WizardQuestionnaireSection({
  number,
  title,
  description,
  optional,
  icon,
  children,
  className,
}: Props) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-100/80",
        className,
      )}
    >
      <header className="flex gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 via-white to-white px-4 py-3.5 sm:px-5">
        <div
          className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-clOcean/[0.07] ring-1 ring-clOcean/15"
          aria-hidden
        >
          {icon ? (
            <WizardSubtleIcon icon={icon} size="md" className="text-clOcean/85" />
          ) : (
            <span className="text-sm font-bold text-[#0d1f3c]/80">{number}</span>
          )}
          {icon ? (
            <span className="absolute -bottom-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#0d1f3c] px-1 text-[9px] font-bold leading-none text-white shadow-sm">
              {number}
            </span>
          ) : null}
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-[#0d1f3c] sm:text-[15px]">{title}</h3>
            {optional ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Optional
              </span>
            ) : null}
          </div>
          {description ? <p className={`mt-0.5 ${wizardHint}`}>{description}</p> : null}
        </div>
      </header>
      <div className="space-y-4 p-4 sm:p-5">{children}</div>
    </section>
  );
}
