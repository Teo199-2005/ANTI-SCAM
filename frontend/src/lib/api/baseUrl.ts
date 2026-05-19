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
  const base = `${getLaravelWebOrigin()}/auth/google/redirect`;
  if (!returnTo?.trim() || !returnTo.startsWith("/") || returnTo.startsWith("//")) {
    return base;
  }
  return `${base}?returnTo=${encodeURIComponent(returnTo)}`;
}
