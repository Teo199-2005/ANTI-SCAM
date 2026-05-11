import { BrandWordmark } from "@/components/branding/BrandWordmark";
import Logo from "@/components/layout/Logo";
import { cn } from "@/lib/utils";

type AppLoadingScreenProps = {
  /**
   * Only selects default submessage when `submessage` is omitted.
   * Visuals are identical for all variants — edit `.app-loading-*` in `globals.css` once.
   */
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
        "app-loading-shell relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-5 py-12 text-zinc-900 antialiased",
        className,
      )}
    >
      <div className="app-loading-overlay pointer-events-none absolute inset-0" aria-hidden />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.42] motion-safe:animate-app-loading-sheen motion-reduce:animate-none app-loading-sheen-layer"
      />
      <div
        aria-hidden
        className="app-loading-grid-layer pointer-events-none absolute inset-0 opacity-[0.4] motion-reduce:opacity-20"
      />

      <div
        className="relative z-10 flex w-full max-w-[380px] flex-col items-center font-dash"
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label={message}
      >
        <div className="app-loading-panel w-full rounded-[1.75rem] px-8 py-9 motion-safe:animate-app-loading-enter motion-reduce:animate-none">
          <div className="flex flex-col items-center gap-6">
            <div className="app-loading-orbit" aria-hidden>
              <div className="app-loading-orbit-glow" />
              <div className="app-loading-orbit-track" />
              <div className="app-loading-orbit-sweep" />
              <div className="app-loading-orbit-core">
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
