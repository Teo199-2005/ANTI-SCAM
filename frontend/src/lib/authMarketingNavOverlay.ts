/**
 * Marketing routes where the nav is fixed + glass so it sits above photography
 * (home hero, auth split imagery). Uses exact matches + known subpaths only —
 * `/` is never matched as a prefix of other paths.
 */
const FLOATING_NAV_EXACT = ["/", "/login", "/register", "/forgot-password"] as const;
const FLOATING_NAV_PREFIX = ["/login/", "/register/", "/forgot-password/"] as const;

export function isAuthMarketingNavOverlayPath(pathname: string | null): boolean {
  if (!pathname) return false;
  if (FLOATING_NAV_EXACT.some((p) => pathname === p)) return true;
  return FLOATING_NAV_PREFIX.some((p) => pathname.startsWith(p));
}

/** Routes that use `AuthSplitShell` under the fixed overlay nav — reserve top space for imagery. */
export function isAuthSplitShellPath(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname === "/login" || pathname === "/register" || pathname === "/forgot-password") return true;
  return ["/login/", "/register/", "/forgot-password/"].some((p) => pathname.startsWith(p));
}

/**
 * `<main>` top padding when marketing navbar is fixed (mobile). One-row bar: logo + menu.
 * `lg:pt-0` — desktop uses full-width overlay row; home hero can stay edge-to-edge on large screens.
 */
export const MARKETING_OVERLAY_MAIN_TOP_PAD_CLASS =
  "max-lg:pt-[max(0.85rem,calc(env(safe-area-inset-top)+4.35rem))] sm:max-lg:pt-[max(1rem,calc(env(safe-area-inset-top)+4.5rem))] lg:pt-0";

/** Negates `<main>` overlay padding so hero backgrounds can extend under the fixed navbar (keep in sync with `MARKETING_OVERLAY_MAIN_TOP_PAD_CLASS`). */
export const MARKETING_OVERLAY_HERO_BLEED_NEG_CLASS =
  "-mt-[max(0.85rem,calc(env(safe-area-inset-top)+4.35rem))] sm:-mt-[max(1rem,calc(env(safe-area-inset-top)+4.5rem))] lg:mt-0";

/**
 * Padding below fixed marketing navbar on auth split (safe-area + one-row mobile bar + buffer).
 * Sync with `MarketingPremiumNavbar` mobile row: logo + menu (~3.25rem) + safe + small buffer.
 */
export const AUTH_SHELL_CLEAR_NAV_MOBILE_PT =
  "pt-[max(0.75rem,calc(env(safe-area-inset-top)+4.1rem))] sm:pt-[max(1rem,calc(env(safe-area-inset-top)+4.25rem))]";

export const AUTH_SHELL_CLEAR_NAV_DESKTOP_ASIDE_PT =
  "pt-[max(1.25rem,calc(env(safe-area-inset-top)+5rem))] md:pt-[max(1.35rem,calc(env(safe-area-inset-top)+5.15rem))] lg:pt-[max(1.5rem,calc(env(safe-area-inset-top)+5.25rem))] xl:pt-[max(1.75rem,calc(env(safe-area-inset-top)+5.35rem))]";

export const AUTH_SHELL_CLEAR_NAV_DESKTOP_FORM_PT =
  "lg:pt-[max(1rem,calc(env(safe-area-inset-top)+5rem))] xl:pt-[max(1.25rem,calc(env(safe-area-inset-top)+5.15rem))]";
