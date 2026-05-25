"use client";

import { publicAssets } from "@/lib/content/publicAssets";
import Image from "next/image";
import { cn } from "@/lib/utils";

const STEP_IMAGES: Record<number, string> = {
  1: publicAssets.onboarding.step(1),
  2: publicAssets.onboarding.step(2),
  3: publicAssets.onboarding.step(3),
  4: publicAssets.onboarding.step(4),
  5: publicAssets.onboarding.step(5),
  6: publicAssets.onboarding.step(6),
};

type Props = {
  step: number;
  variant?: "panel" | "strip";
  /** Tighter layout for the registration modal (not full viewport). */
  compact?: boolean;
  className?: string;
};

export function WizardStepIllustration({ step, variant = "panel", compact = false, className }: Props) {
  const src = STEP_IMAGES[step] ?? STEP_IMAGES[1];

  if (variant === "strip") {
    return (
      <div
        className={cn(
          "relative w-full shrink-0 overflow-hidden bg-gradient-to-br from-[#0d1f3c] via-[#122a4d] to-[#0a1628] lg:hidden",
          compact ? "h-[16rem] sm:h-[18rem]" : "h-[12.5rem] sm:h-[14rem]",
          className,
        )}
      >
        <div
          className="pointer-events-none absolute inset-0 bg-center bg-no-repeat opacity-[0.07]"
          style={{
            backgroundImage: `url('${publicAssets.branding.mainlogo}')`,
            backgroundSize: "45%",
          }}
          aria-hidden
        />
        <Image
          src={src}
          alt=""
          fill
          className={cn(
            "object-contain object-center drop-shadow-xl",
            compact ? "p-1 sm:p-2" : "p-3 sm:p-4",
          )}
          sizes="100vw"
          unoptimized
          priority
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative hidden min-h-0 shrink-0 overflow-hidden bg-gradient-to-br from-[#0d1f3c] via-[#122a4d] to-[#0a1628] lg:flex lg:flex-col",
        compact ? "w-[48%] min-w-[280px] max-w-[520px] xl:max-w-[560px]" : "w-[46%] max-w-[640px] xl:w-[42%]",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-center bg-no-repeat opacity-[0.08]"
        style={{
          backgroundImage: `url('${publicAssets.branding.mainlogo}')`,
          backgroundSize: "min(420px, 70%)",
        }}
        aria-hidden
      />
      <div className={cn("relative m-auto flex h-full w-full items-center justify-center", compact ? "p-2 xl:p-3" : "p-6 xl:p-10")}>
        <Image
          src={src}
          alt=""
          width={960}
          height={960}
          className={cn(
            "h-auto w-full object-contain drop-shadow-2xl",
            compact
              ? "max-h-[min(62vh,640px)] max-w-[min(100%,520px)] xl:max-w-[540px]"
              : "max-h-[min(88vh,680px)] max-w-[min(92%,560px)] xl:max-w-[600px]",
          )}
          sizes={compact ? "(min-width: 1024px) 560px" : "(min-width: 1024px) 42vw"}
          unoptimized
          priority
        />
      </div>
    </div>
  );
}
