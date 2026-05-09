import type { NextRequest } from "next/server";

/**
 * Whether the session cookie should use the `Secure` flag.
 * Do not tie this to `NODE_ENV`: `next start` on `http://localhost` is still "production"
 * but browsers will refuse `Secure` cookies over HTTP, so login appears to do nothing.
 */
export function sessionCookieSecure(req: NextRequest): boolean {
  const forwarded = req.headers.get("x-forwarded-proto");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim().toLowerCase() === "https";
  }
  return req.nextUrl.protocol === "https:";
}
