"use client";

import Image from "next/image";
import type { ReactNode } from "react";

/**
 * Brand hero for auth split layout (`frontend/public/login.png`).
 * File: 1086×1448 PNG, portrait, aspect ratio ≈ 3:4 (width ÷ height ≈ 0.75).
 * Desktop: padded inset (`p-6`→`xl:p-10`) so the poster sits off the edges; `object-contain` inside that box.
 * Mobile strip: outer padding + rounded inner frame; `object-cover` + `object-top`.
 */
const BRAND_HERO_SRC = "/login.png";

/**
 * Mobile-only outer frame around the auth card (`lg:contents` = no extra box on desktop).
 * Gives a clear “app sheet” container: ocean-tinted rim, inset highlight, depth.
 */
export const AUTH_MOBILE_FORM_CHROME =
  "lg:contents max-lg:w-full max-lg:rounded-[1.4rem] max-lg:border max-lg:border-clOcean/25 max-lg:bg-gradient-to-b max-lg:from-[#dfeaf6] max-lg:via-white max-lg:to-[#f4f7fb] max-lg:p-1 max-lg:shadow-[0_24px_60px_-34px_rgba(13,30,66,0.55),0_0_0_1px_rgba(255,255,255,0.55)_inset] max-lg:ring-1 max-lg:ring-white/60";

/** Shared elevated card for login / register / forgot-password — compact padding. */
export const AUTH_MARKETING_CARD =
  "relative overflow-hidden rounded-2xl border border-zinc-200/70 bg-white/95 p-5 shadow-[0_18px_36px_-16px_rgba(13,30,66,0.16),0_0_0_1px_rgba(255,255,255,0.75)_inset] backdrop-blur-xl sm:p-6 " +
  "max-lg:rounded-[1.12rem] max-lg:border-zinc-200/70 max-lg:bg-white max-lg:px-[1.125rem] max-lg:py-6 " +
  "max-lg:shadow-[inset_0_1px_0_rgba(255,255,255,1),0_10px_32px_-22px_rgba(13,30,66,0.14)] " +
  "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:z-[1] before:h-[3px] before:bg-gradient-to-r before:from-clOcean before:via-clTeal before:to-sky-400 before:content-[''] before:hidden max-lg:before:block";

type AuthSplitShellProps = {
  children: ReactNode;
};

/**
 * Split auth layout: patterned left column + full-height branding image on large screens.
 */
export function AuthSplitShell({ children }: AuthSplitShellProps) {
  return (
    <div className="relative min-h-screen bg-[#f4f6f9]">
      <div className="flex min-h-screen flex-col lg:flex-row lg:items-stretch">
        {/* Mobile: taller hero + brand line; desktop uses aside only */}
        {/* Extra bottom padding so taglines stay above the form sheet (sheet uses negative margin). */}
        <div className="relative shrink-0 bg-[#0d1e42] px-3 pb-12 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-4 sm:pb-14 sm:pt-4 lg:hidden">
          {/* Art only inside the frame — never stack HTML text on the bitmap (overlaps campaign type). */}
          <div className="relative h-[min(38svh,13.5rem)] min-h-[11.5rem] w-full overflow-hidden rounded-2xl sm:h-[min(36svh,15rem)] sm:min-h-[12.5rem]">
            <Image
              src={BRAND_HERO_SRC}
              alt="Anti-Scam PH — safe resort bookings"
              fill
              className="object-cover object-[center_15%]"
              sizes="100vw"
              priority
            />
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0a1628]/55 via-transparent to-transparent"
              aria-hidden
            />
          </div>
          <div className="mt-2.5 space-y-1 px-1 sm:mt-3">
            <p className="text-center font-heading text-sm font-semibold tracking-tight text-white/90">
              Anti-Scam PH
            </p>
            <p className="mx-auto max-w-[20rem] text-center text-[11px] leading-snug text-white/70">
              Verify. Check. Protect. · Philippines
            </p>
          </div>
        </div>

        {/* Left: authentication panel — 50% width on large screens */}
        <div className="relative z-10 flex w-full min-w-0 flex-1 flex-col lg:w-1/2 lg:flex-none lg:shrink-0">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.55] max-lg:opacity-40"
            aria-hidden
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%230d1e42' fill-opacity='0.06'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(26,77,148,0.14),transparent_55%),radial-gradient(ellipse_60%_40%_at_100%_100%,rgba(13,30,66,0.08),transparent)] max-lg:opacity-70"
            aria-hidden
          />
          {/* Mobile: sheet-style panel overlapping hero for app-like flow */}
          <div
            className="relative flex flex-1 flex-col justify-center px-3 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-2 -mt-2 max-lg:rounded-t-[1.75rem] max-lg:bg-[#f4f6f9] max-lg:shadow-[0_-16px_48px_-20px_rgba(13,30,66,0.22)] sm:-mt-3 sm:px-5 sm:pt-3 lg:mt-0 lg:rounded-none lg:bg-transparent lg:px-8 lg:py-10 lg:shadow-none xl:px-10"
          >
            <div className="mx-auto w-full max-w-md pb-1 lg:max-w-lg">
              <div className={AUTH_MOBILE_FORM_CHROME}>{children}</div>
            </div>
          </div>
        </div>

        {/* Right: full-height branding (desktop) — inset padding shrinks the poster away from corners */}
        <aside className="relative hidden min-h-screen w-full min-w-0 shrink-0 bg-[#0d1e42] lg:block lg:w-1/2">
          <div className="absolute inset-0 p-6 md:p-8 lg:py-10 lg:px-8 xl:p-10 xl:px-10">
            <div className="relative h-full w-full min-h-0">
              <Image
                src={BRAND_HERO_SRC}
                alt="Anti-Scam PH — safe travels, verified resorts"
                fill
                sizes="50vw"
                className="object-contain object-center"
                priority
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
