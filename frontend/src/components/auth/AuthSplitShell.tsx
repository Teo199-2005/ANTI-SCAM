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

/** Shared elevated card for login / register / forgot-password — compact padding. */
export const AUTH_MARKETING_CARD =
  "rounded-2xl border border-zinc-200/70 bg-white/95 p-5 shadow-[0_18px_36px_-16px_rgba(13,30,66,0.16),0_0_0_1px_rgba(255,255,255,0.75)_inset] backdrop-blur-xl sm:p-6";

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
        {/* Mobile / small tablet: hero strip — inset so the art doesn’t touch the strip edges */}
        <div className="relative h-48 shrink-0 bg-[#0d1e42] px-3 pt-3 pb-3 sm:h-56 sm:px-4 sm:pt-4 sm:pb-4 lg:hidden">
          <div className="relative h-full w-full overflow-hidden rounded-xl sm:rounded-2xl">
            <Image
              src={BRAND_HERO_SRC}
              alt="Anti-Scam PH — safe resort bookings"
              fill
              className="object-cover object-top"
              sizes="100vw"
              priority
            />
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0a1628]/85 via-transparent to-transparent"
              aria-hidden
            />
          </div>
        </div>

        {/* Left: authentication panel — 50% width on large screens */}
        <div className="relative z-10 flex w-full min-w-0 flex-1 flex-col lg:w-1/2 lg:flex-none lg:shrink-0">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.55]"
            aria-hidden
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%230d1e42' fill-opacity='0.06'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(26,77,148,0.14),transparent_55%),radial-gradient(ellipse_60%_40%_at_100%_100%,rgba(13,30,66,0.08),transparent)]"
            aria-hidden
          />
          <div className="relative flex flex-1 flex-col justify-center px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10 xl:px-10">
            <div className="mx-auto w-full max-w-md lg:max-w-lg">{children}</div>
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
