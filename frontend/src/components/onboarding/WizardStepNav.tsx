"use client";

import { WizardSubtleIcon } from "@/components/onboarding/WizardSubtleIcon";
import { WIZARD_STEP_TITLES } from "@/lib/onboarding/labels";
import { WIZARD_STEP_ICONS } from "@/lib/onboarding/wizardIcons";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

type Props = {
  currentStep: number;
  className?: string;
};

export function WizardStepNav({ currentStep, className }: Props) {
  return (
    <ol
      className={cn(
        "mt-3 flex w-full gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      aria-label="Registration steps"
    >
      {WIZARD_STEP_TITLES.map((label, index) => {
        const n = index + 1;
        const done = n < currentStep;
        const active = n === currentStep;
        const StepIcon = WIZARD_STEP_ICONS[index];

        return (
          <li key={label} className="shrink-0">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold transition sm:px-3 sm:text-[11px]",
                active && "bg-[#0d1f3c] text-white shadow-sm",
                done && !active && "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80",
                !active && !done && "bg-slate-100 text-slate-500",
              )}
              aria-current={active ? "step" : undefined}
            >
              {done ? (
                <Check className="h-3 w-3 shrink-0" strokeWidth={2.5} aria-hidden />
              ) : StepIcon ? (
                <WizardSubtleIcon
                  icon={StepIcon}
                  size="xs"
                  className={cn(active ? "text-white/85" : done ? "text-emerald-600/90" : "text-slate-400")}
                />
              ) : null}
              <span className="tabular-nums">{n}.</span>
              <span className="max-w-[5.5rem] truncate sm:max-w-none">{label}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
