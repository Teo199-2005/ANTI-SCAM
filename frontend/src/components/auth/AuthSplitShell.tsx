"use client";

import { BrandWordmark } from "@/components/branding/BrandWordmark";
import {
  AUTH_SHELL_CLEAR_NAV_DESKTOP_ASIDE_PT,
  AUTH_SHELL_CLEAR_NAV_DESKTOP_FORM_PT,
  AUTH_SHELL_CLEAR_NAV_MOBILE_PT,
  isAuthSplitShellPath,
} from "@/lib/authMarketingNavOverlay";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { usePathname } from "next/navigation";
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

/**
 * Shared elevated card for login / register / forgot-password — compact padding.
 * `.auth-card-bg` (in globals.css) supplies the diagonal-striped-brick texture
 * over an opaque white base. Distinct from `.auth-paper-bg` (grey-sandbag)
 * used on the page shell, so the card reads as a visually separate surface
 * from the surrounding page. Defined as a real CSS class instead of a Tailwind
 * arbitrary background-image utility, because the JIT-emitted version of
 * that utility tripped Next.js / Webpack css-loader URL resolution.
 *
 * NOTE: never write a Tailwind arbitrary background utility that wraps a CSS
 * url function in this file (or in any other Tailwind-scanned source). The
 * JIT extracts class candidates from comments and strings via regex, and any
 * such literal will be re-emitted as a CSS rule with an unresolvable url()
 * argument and break the dev build.
 */
export const AUTH_MARKETING_CARD =
  "auth-card-bg relative overflow-hidden rounded-2xl border border-zinc-200/70 p-5 shadow-[0_18px_36px_-16px_rgba(13,30,66,0.16),0_0_0_1px_rgba(255,255,255,0.75)_inset] backdrop-blur-xl sm:p-6 " +
  "max-lg:rounded-[1.12rem] max-lg:border-zinc-200/70 max-lg:px-[1.125rem] max-lg:py-6 " +
  "max-lg:shadow-[inset_0_1px_0_rgba(255,255,255,1),0_10px_32px_-22px_rgba(13,30,66,0.14)] " +
  "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:z-[1] before:h-[3px] before:bg-gradient-to-r before:from-clOcean before:via-clTeal before:to-sky-400 before:content-[''] before:hidden max-lg:before:block";

type AuthSplitShellProps = {
  children: ReactNode;
};

/**
 * Split auth layout: patterned left column + full-height branding image on large screens.
 */
export function AuthSplitShell({ children }: AuthSplitShellProps) {
  const pathname = usePathname();
  /** Auth pages use fixed nav — pad so hero/imagery is not covered (marketing home uses its own hero). */
  const clearFixedNav = isAuthSplitShellPath(pathname);
  /** Register: single centered column — no side image / no mobile hero strip (clean layout). */
  const registerCentered = pathname === "/register" || pathname.startsWith("/register/");

  return (
    <div className="auth-paper-bg relative min-h-screen">
      <div
        className={cn(
          "flex min-h-screen flex-col lg:flex-row lg:items-stretch",
          registerCentered && "lg:justify-center"
        )}
      >
        {/* Mobile: hero strip — hidden on /register (centered clean layout) */}
        {!registerCentered ? (
          <div
            className={cn(
              "relative z-0 shrink-0 bg-[#0d1e42] px-3 pb-12 sm:px-4 sm:pb-14 lg:hidden",
              clearFixedNav ? AUTH_SHELL_CLEAR_NAV_MOBILE_PT : "pt-[max(0.75rem,env(safe-area-inset-top))] sm:pt-4"
            )}
          >
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
              <div className="flex justify-center">
                <BrandWordmark tone="onDark" size="sm" className="items-center" />
              </div>
              <p className="mx-auto max-w-[20rem] text-center text-[11px] leading-snug text-white/70">
                Verify. Check. Protect. · Philippines
              </p>
            </div>
          </div>
        ) : null}

        {/* Auth panel — full width when register; half width + side image otherwise */}
        <div
          className={cn(
            "relative z-10 flex w-full min-w-0 flex-1 flex-col",
            registerCentered ? "lg:mx-auto lg:w-full lg:max-w-4xl lg:flex-none lg:shrink-0 lg:justify-center" : "lg:w-1/2 lg:flex-none lg:shrink-0",
            clearFixedNav &&
              (registerCentered
                ? cn(
                    "max-lg:pt-[max(0.75rem,calc(env(safe-area-inset-top)+4.1rem))] sm:max-lg:pt-[max(1rem,calc(env(safe-area-inset-top)+4.25rem))]",
                    AUTH_SHELL_CLEAR_NAV_DESKTOP_FORM_PT
                  )
                : AUTH_SHELL_CLEAR_NAV_DESKTOP_FORM_PT)
          )}
        >
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
            className={cn(
              "auth-paper-bg relative flex flex-1 flex-col justify-center px-3 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-2 max-lg:-mt-2 max-lg:rounded-t-[1.75rem] max-lg:shadow-[0_-16px_48px_-20px_rgba(13,30,66,0.22)] sm:max-lg:-mt-3 sm:px-5 sm:max-lg:pt-3 lg:mt-0 lg:rounded-none lg:bg-transparent lg:px-8 lg:py-10 lg:shadow-none xl:px-10",
              registerCentered && "max-lg:mt-0 max-lg:rounded-none max-lg:shadow-none lg:min-h-0 lg:py-8 xl:py-10"
            )}
          >
            <div
              className={cn(
                "mx-auto w-full max-w-md pb-1 lg:max-w-lg",
                registerCentered && "lg:max-w-2xl"
              )}
            >
              <div className={AUTH_MOBILE_FORM_CHROME}>{children}</div>
            </div>
          </div>
        </div>

        {/* Right: branding poster — hidden on /register */}
        {!registerCentered ? (
          <aside className="relative z-0 hidden min-h-screen w-full min-w-0 shrink-0 bg-[#0d1e42] lg:block lg:w-1/2">
            <div
              className={cn(
                "absolute inset-0",
                clearFixedNav
                  ? cn(
                      "p-6 pb-6 md:p-8 md:pb-8 lg:px-8 lg:pb-10 xl:px-10 xl:pb-10",
                      AUTH_SHELL_CLEAR_NAV_DESKTOP_ASIDE_PT
                    )
                  : "p-6 md:p-8 lg:py-10 lg:px-8 xl:p-10 xl:px-10"
              )}
            >
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
        ) : null}
      </div>
    </div>
  );
}
