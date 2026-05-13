import { BrandWordmark } from "@/components/branding/BrandWordmark";
import Logo from "@/components/layout/Logo";
import { cn } from "@/lib/utils";

type AppLoadingScreenProps = {
  variant?: "marketing" | "dashboard";
  message?: string;
  submessage?: string;
  className?: string;
};

export default function AppLoadingScreen({
  variant = "marketing",
  message = "Loading",
  submessage,
  className,
}: AppLoadingScreenProps) {
  const defaultSub =
    variant === "dashboard"
      ? "Verifying your session and preparing your workspace."
      : "We're getting everything ready for you.";

  return (
    <div
      className={cn(
        "relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-zinc-50 via-white to-zinc-100 px-5 py-12 text-zinc-900 antialiased",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(13,30,66,0.06),transparent_55%)]"
      />

      <div
        className="relative z-10 flex w-full max-w-[380px] flex-col items-center font-dash"
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label={message}
      >
        <div className="w-full rounded-[1.75rem] border border-zinc-200/80 bg-white/95 px-8 py-9 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur-sm">
          <div className="flex flex-col items-center gap-7">
            {/* Explicit spinner: Tailwind animate-spin only — legacy .app-loading-* CSS was never wired */}
            <div className="relative flex h-[8.5rem] w-[8.5rem] shrink-0 items-center justify-center" aria-hidden>
              {/* PH flag colors around the ring: yellow (top) → red (right) → blue (bottom) */}
              <div
                className={cn(
                  "absolute inset-0 rounded-full border-[5px] border-transparent",
                  "border-t-yellow-400 border-r-red-500 border-b-blue-600",
                  "motion-safe:animate-spin motion-reduce:border-zinc-300 motion-reduce:animate-none",
                )}
                style={{ animationDuration: "1s" }}
              />
              <div className="relative z-[1] flex items-center justify-center">
                <Logo size="lg" />
              </div>
            </div>

            <div className="text-center">
              <p className="text-base font-semibold tracking-tight text-navy md:text-lg">{message}</p>
              <p className="mt-2 text-xs leading-relaxed text-zinc-500 md:text-sm">{submessage ?? defaultSub}</p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <BrandWordmark tone="onLight" size="2xs" className="opacity-90" />
        </div>
      </div>
    </div>
  );
}
