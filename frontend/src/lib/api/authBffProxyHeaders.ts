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

/** JSON headers for Laravel BFF fetches, including forwarded client IP when known. */
export function authBffJsonHeaders(req: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const ip = clientIpFromNextRequest(req);
  if (ip) {
    headers["X-Forwarded-For"] = ip;
    headers["X-Real-IP"] = ip;
  }
  return headers;
}
