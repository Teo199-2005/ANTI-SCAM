"use client";

import { BrandWordmark } from "@/components/branding/BrandWordmark";
import Logo from "@/components/layout/Logo";
import { ResortRegistrationWizardModal } from "@/components/onboarding/ResortRegistrationWizardModal";
import { WizardStepIllustration } from "@/components/onboarding/WizardStepIllustration";
import { WizardStepNav } from "@/components/onboarding/WizardStepNav";
import { WizardSubtleIcon } from "@/components/onboarding/WizardSubtleIcon";
import { WizardWatermark } from "@/components/onboarding/WizardWatermark";
import { WIZARD_STEP_TITLES } from "@/lib/onboarding/labels";
import { wizardStepIcon } from "@/lib/onboarding/wizardIcons";
import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowRight, Check, Cloud, Loader2 } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  step: number;
  progressPercent: number;
  saveLabel?: string | null;
  saving?: boolean;
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  backDisabled?: boolean;
  showBack?: boolean;
  children: ReactNode;
};

export function ResortRegistrationWizardShell({
  step,
  progressPercent,
  saveLabel,
  saving,
  onBack,
  onNext,
  nextLabel = "Next",
  nextDisabled,
  backDisabled,
  showBack = true,
  children,
}: Props) {
  const title = WIZARD_STEP_TITLES[step - 1] ?? "Registration";
  const HeaderStepIcon = wizardStepIcon(step);

  return (
    <ResortRegistrationWizardModal>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="resort-registration-wizard-title"
        className={cn(
          "flex h-auto w-full max-h-[min(calc(100dvh-1.5rem),60rem)] flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-[#f4f7fb] shadow-[0_25px_60px_-12px_rgba(13,31,60,0.35)] ring-1 ring-black/10",
        )}
      >
        <header className="z-30 shrink-0 border-b border-slate-200/80 bg-white/95 px-4 pb-3 pt-4 shadow-sm sm:px-5 sm:pt-4">
          <div className="flex items-center gap-3">
            <div className="flex shrink-0 items-center gap-2.5">
              <Logo size="sm" className="shadow-sm" />
              <BrandWordmark tone="onLight" size="xs" displayHeading subtitle subtitleSmOnly />
            </div>
            <div className="min-w-0 flex-1">
              <p
                id="resort-registration-wizard-title"
                className="flex items-center gap-1.5 truncate text-sm font-semibold text-[#0d1f3c]"
              >
                <WizardSubtleIcon icon={HeaderStepIcon} size="sm" className="text-clOcean/80" />
                <span className="truncate">Resort registration · Step {step} of 6</span>
              </p>
              <p className="truncate pl-5 text-xs text-slate-500">{title}</p>
            </div>
            {saveLabel ? (
              <span className="inline-flex shrink-0 items-center gap-1 text-xs text-slate-500">
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-clOcean/70" aria-hidden />
                ) : (
                  <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
                )}
                {!saving && saveLabel.toLowerCase().includes("saved") ? (
                  <Cloud className="h-3 w-3 text-slate-400" strokeWidth={1.75} aria-hidden />
                ) : null}
                {saveLabel}
              </span>
            ) : null}
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-clOcean to-clTeal transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
            />
          </div>
          <WizardStepNav currentStep={step} className="max-w-none" />
        </header>

        <div className="flex min-h-0 flex-col overflow-hidden lg:flex-row lg:items-stretch">
          <WizardStepIllustration step={step} variant="strip" compact />
          <WizardStepIllustration step={step} variant="panel" compact />

          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
            <WizardWatermark />
            <div className="max-h-[min(52vh,calc(100dvh-13rem))] overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
              <div className="mx-auto w-full max-w-2xl lg:max-w-lg xl:max-w-xl">{children}</div>
            </div>

            <footer className="z-20 shrink-0 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-md sm:px-6">
              <div className="mx-auto flex max-w-2xl gap-3">
                {showBack && onBack ? (
                  <button
                    type="button"
                    onClick={onBack}
                    disabled={backDisabled || saving}
                  className={cn(
                    "inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50",
                  )}
                >
                  <ArrowLeft className="h-4 w-4 text-slate-400" strokeWidth={1.75} aria-hidden />
                  Back
                </button>
                ) : (
                  <div className="flex-1" />
                )}
                {onNext ? (
                  <button
                    type="button"
                    onClick={onNext}
                    disabled={nextDisabled || saving}
                  className={cn(
                    "inline-flex min-h-[44px] flex-[1.2] items-center justify-center gap-1.5 rounded-xl bg-[#0d1f3c] px-4 text-sm font-semibold text-white shadow-md transition hover:bg-[#122a4d] disabled:opacity-50",
                  )}
                >
                  {saving ? (
                    <span className="inline-flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Saving…
                    </span>
                  ) : (
                    <>
                      {nextLabel}
                      <ArrowRight className="h-4 w-4 text-white/80" strokeWidth={1.75} aria-hidden />
                    </>
                  )}
                  </button>
                ) : null}
              </div>
            </footer>
          </div>
        </div>
      </div>
    </ResortRegistrationWizardModal>
  );
}
