import { NextResponse } from "next/server";

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

  const lower = text.toLowerCase();
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
