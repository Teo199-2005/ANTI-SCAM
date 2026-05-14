/**
 * Resolves the Laravel JSON API root used by the Next.js BFF proxy and publicClient.
 * Accepts env values like `http://127.0.0.1:8000` or `http://127.0.0.1:8000/api/v1`.
 */
function normalizeLaravelApiV1Base(rawInput: string): string {
  const raw = rawInput.trim().replace(/\/+$/, "");
  if (/\/api\/v\d+$/i.test(raw)) {
    return raw;
  }
  if (/\/api$/i.test(raw)) {
    return `${raw}/v1`;
  }
  return `${raw}/api/v1`;
}

function firstNonEmptyEnv(...keys: string[]): string | undefined {
  for (const key of keys) {
    const v = process.env[key];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return undefined;
}

function isLoopbackHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

/**
 * Browser / shared — uses `NEXT_PUBLIC_API_BASE_URL` (inlined at build time).
 *
 * On a real deployed host (not localhost), the browser always uses
 * `{window.location.origin}/api/v1` so Terms and `publicClient` keep working even if
 * production was built without a correct `NEXT_PUBLIC_API_BASE_URL` (a common VPS issue).
 * Local dev on localhost / 127.0.0.1 still uses the env default pointing at Laravel.
 */
export function laravelApiV1BaseUrl(): string {
  if (typeof window !== "undefined" && !isLoopbackHostname(window.location.hostname)) {
    const origin = window.location.origin.replace(/\/$/, "");
    return `${origin}/api/v1`;
  }
  const raw = firstNonEmptyEnv("NEXT_PUBLIC_API_BASE_URL") ?? "http://127.0.0.1:8000/api/v1";
  return normalizeLaravelApiV1Base(raw);
}

/**
 * Next.js Route Handlers only — prefers server-side `LARAVEL_API_BASE_URL` so `.env.local`
 * changes apply without rebuilding client bundles (fixes recurring “demo login works after rebuild” confusion).
 *
 * Call this **inside** each request handler (not at module load). Next may inline `process.env` at build
 * for route modules; reading here per request picks up `.env.production` after VPS edits + `pm2 restart`.
 */
export function serverLaravelApiV1BaseUrl(): string {
  const raw =
    firstNonEmptyEnv("LARAVEL_API_BASE_URL", "NEXT_PUBLIC_API_BASE_URL") ??
    "http://127.0.0.1:8000/api/v1";
  return normalizeLaravelApiV1Base(raw);
}

/**
 * Laravel `public/` origin (files under `/storage/...` live here).
 * Used by server-side routes that proxy uploads when the browser uses the Next host for `/storage/`.
 */
export function serverLaravelWebOrigin(): string {
  return serverLaravelApiV1BaseUrl().replace(/\/api\/v\d+$/i, "");
}
