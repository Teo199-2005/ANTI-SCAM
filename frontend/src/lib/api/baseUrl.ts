import { laravelApiV1BaseUrl } from "@/lib/api/laravelApiBase";

/**
 * Base URL for Laravel *web* routes (OAuth redirect lives here, not under /api/v1).
 */
export function getLaravelWebOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_LARAVEL_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }
  return laravelApiV1BaseUrl().replace(/\/api\/v1$/i, "");
}

export function googleOAuthRedirectUrl(returnTo?: string | null): string {
  // Production serves the marketing host via Next.js; OAuth is proxied at /auth/google/* on the same origin.
  const origin =
    typeof window !== "undefined"
      ? window.location.origin.replace(/\/$/, "")
      : getLaravelWebOrigin();
  const base = `${origin}/auth/google/redirect`;
  if (!returnTo?.trim() || !returnTo.startsWith("/") || returnTo.startsWith("//")) {
    return base;
  }
  return `${base}?returnTo=${encodeURIComponent(returnTo)}`;
}
