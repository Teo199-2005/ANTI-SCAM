/**
 * Base URL for Laravel *web* routes (OAuth redirect lives here, not under /api/v1).
 */
export function getLaravelWebOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_LARAVEL_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }
  const api = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api/v1").trim();
  return api.replace(/\/api\/v1\/?$/i, "");
}

export function googleOAuthRedirectUrl(): string {
  return `${getLaravelWebOrigin()}/auth/google/redirect`;
}
