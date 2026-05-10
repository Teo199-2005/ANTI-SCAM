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

/**
 * Browser / shared — uses `NEXT_PUBLIC_API_BASE_URL` (inlined where client bundles import this module).
 */
export function laravelApiV1BaseUrl(): string {
  const raw = firstNonEmptyEnv("NEXT_PUBLIC_API_BASE_URL") ?? "http://127.0.0.1:8000/api/v1";
  return normalizeLaravelApiV1Base(raw);
}

/**
 * Next.js Route Handlers only — prefers server-side `LARAVEL_API_BASE_URL` so `.env.local`
 * changes apply without rebuilding client bundles (fixes recurring “demo login works after rebuild” confusion).
 */
export function serverLaravelApiV1BaseUrl(): string {
  const raw =
    firstNonEmptyEnv("LARAVEL_API_BASE_URL", "NEXT_PUBLIC_API_BASE_URL") ??
    "http://127.0.0.1:8000/api/v1";
  return normalizeLaravelApiV1Base(raw);
}
