import { createHash } from "crypto";
import type { NextRequest } from "next/server";

/**
 * Client IP as seen by Next.js (set by Nginx / the edge). Used when proxying auth
 * requests to Laravel so rate limits apply per visitor, not per server.
 */
export function clientIpFromNextRequest(req: NextRequest): string | undefined {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const xReal = req.headers.get("x-real-ip")?.trim();
  if (xReal) return xReal;
  const vercel = req.headers.get("x-vercel-forwarded-for")?.trim();
  if (vercel) {
    return vercel.split(",")[0]?.trim() || undefined;
  }
  return undefined;
}

/**
 * When the browser talks to Next.js directly (local dev), there is often no X-Forwarded-For.
 * Without a per-visitor key, Laravel rate limits every user as one IP (127.0.0.1) and shows
 * "Too Many Attempts" after a few tries across the whole machine.
 */
export function rateLimitClientKey(req: NextRequest, emailForFallback?: string): string | undefined {
  const ip = clientIpFromNextRequest(req);
  if (ip) return ip;

  const email = emailForFallback?.trim().toLowerCase();
  if (email) {
    const digest = createHash("sha256").update(email).digest("hex").slice(0, 32);
    return `email-${digest}`;
  }

  return undefined;
}

/** JSON headers for Laravel BFF fetches, including forwarded client IP when known. */
export function authBffJsonHeaders(
  req: NextRequest,
  options?: { emailForRateLimit?: string },
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const ip = rateLimitClientKey(req, options?.emailForRateLimit);
  if (ip) {
    headers["X-Forwarded-For"] = ip;
    headers["X-Real-IP"] = ip;
  }
  return headers;
}
