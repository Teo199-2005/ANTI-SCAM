"use client";

import { WizardSubtleIcon } from "@/components/onboarding/WizardSubtleIcon";
import { wizardHint, wizardSectionTitle } from "@/components/onboarding/wizardStyles";
import { WIZARD_STEP_TITLES } from "@/lib/onboarding/labels";
import { wizardStepIcon } from "@/lib/onboarding/wizardIcons";
import { cn } from "@/lib/utils";
import { ClipboardList } from "lucide-react";

type Props = {
  step: number;
  title?: string;
  description: string;
  className?: string;
};

export function WizardStepIntro({ step, title, description, className }: Props) {
  const heading = title ?? WIZARD_STEP_TITLES[step - 1] ?? "Registration";
  const StepIcon = wizardStepIcon(step);

  return (
    <div
      className={cn(
        "mb-5 flex gap-4 rounded-2xl border border-clOcean/25 bg-gradient-to-br from-clOcean/[0.08] via-white to-teal-50/30 p-4 shadow-sm sm:mb-6 sm:p-5",
        className,
      )}
    >
      <div className="relative shrink-0" aria-hidden>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-clOcean/[0.1] ring-1 ring-clOcean/20 sm:h-14 sm:w-14">
          <WizardSubtleIcon icon={StepIcon} size="lg" className="text-clOcean" />
        </div>
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0d1f3c] px-1 text-[10px] font-bold text-white shadow-sm">
          {step}
        </span>
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-clOcean">
          <ClipboardList className="h-3 w-3 text-clOcean/70" strokeWidth={1.75} aria-hidden />
          Resort registration
        </p>
        <h2 className={`mt-0.5 ${wizardSectionTitle}`}>{heading}</h2>
        <p className={`mt-1.5 ${wizardHint} sm:text-sm`}>{description}</p>
      </div>
    </div>
  );
}
