import { NextResponse } from "next/server";

export const BFF_UPSTREAM_TIMEOUT_MS = 120_000;

function looksLikeCloudflareChallenge(html: string): boolean {
  const lower = html.toLowerCase();
  return (
    lower.includes("cloudflare") &&
    (lower.includes("checking your browser") ||
      lower.includes("cf-mitigated") ||
      lower.includes("challenge") ||
      lower.includes("cf-ray") ||
      lower.includes("__cf_bm"))
  );
}

function isLoopbackHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

/**
 * In production, block server-side calls to the public site (Cloudflare HTML 403 / hangs).
 * Returns a JSON 503 response, or null when the backend URL is acceptable.
 */
export function rejectPublicLaravelBackendInProduction(backendBase: string): NextResponse | null {
  if (process.env.NODE_ENV !== "production") {
    return null;
  }
  try {
    const host = new URL(backendBase).hostname;
    if (!isLoopbackHostname(host)) {
      return NextResponse.json(
        {
          success: false,
          code: "bff_laravel_not_loopback",
          message:
            "Dashboard uploads are misconfigured on the server. Set LARAVEL_API_BASE_URL=http://127.0.0.1:8080/api/v1 in the frontend env, then run: pm2 restart all --update-env",
        },
        { status: 503 },
      );
    }
  } catch {
    // Invalid URL — let fetch fail naturally.
  }
  return null;
}

/**
 * POST/PATCH multipart to Laravel on loopback (used by /api/backend and /api/upload).
 */
export async function fetchLaravelUpstream(targetUrl: string, init: RequestInit): Promise<Response> {
  return fetch(targetUrl, {
    ...init,
    signal: AbortSignal.timeout(BFF_UPSTREAM_TIMEOUT_MS),
  });
}

/**
 * Turn a non-JSON upstream response (often Cloudflare HTML on 403) into a JSON body the SPA can parse.
 */
export function jsonFromNonJsonUpstream(
  status: number,
  bytes: ArrayBuffer,
  contextLabel: string,
): NextResponse {
  const text = new TextDecoder().decode(bytes.slice(0, 2048));
  console.error(`[${contextLabel}] Non-JSON error from backend (${status}):`, text.slice(0, 500));

  const cfChallenge = looksLikeCloudflareChallenge(text);
  const cfOpsHint =
    "Request blocked (403) before Laravel — usually the Next.js server is calling your public site through Cloudflare (HTML challenge). On the VPS, set LARAVEL_API_BASE_URL to an internal URL (e.g. http://127.0.0.1:8080/api/v1 per deployment/nginx-laravel-loopback.example.conf), not https://your-domain/.... Then pm2 restart the frontend with --update-env. In Cloudflare: Security → Events if you must use the public URL.";
  const cfUserMessage =
    "We could not reach the booking system from the app server (connection blocked). Please try again in a moment. If this continues, contact support — the host may need an internal API URL for the dashboard.";

  const message =
    status === 403 && cfChallenge
      ? process.env.NODE_ENV === "production"
        ? cfUserMessage
        : cfOpsHint
      : status === 403
        ? "Upload was blocked before it reached the API. On the VPS, set LARAVEL_API_BASE_URL=http://127.0.0.1:8080/api/v1 and run pm2 restart all --update-env."
        : `Server error (${status}). Check API logs.`;

  const body: Record<string, unknown> = { success: false, message };
  if (status === 403 && cfChallenge && process.env.NODE_ENV === "production") {
    body.code = "bff_upstream_cloudflare_html";
  }

  return NextResponse.json(body, { status });
}

export function jsonUpstreamTimeout(contextLabel: string): NextResponse {
  console.error(`[${contextLabel}] upstream timed out after ${BFF_UPSTREAM_TIMEOUT_MS}ms`);
  return NextResponse.json(
    {
      success: false,
      code: "bff_upstream_timeout",
      message:
        "Saving the file on the server timed out. Check LARAVEL_API_BASE_URL=http://127.0.0.1:8080/api/v1, PHP-FPM, and run php artisan media:verify in the backend folder.",
    },
    { status: 504 },
  );
}

export function isUpstreamTimeoutError(err: unknown): boolean {
  return err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
}
