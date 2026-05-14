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

const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7;

/**
 * httpOnly session cookie for `rs_session`.
 * Uses SameSite=Lax so returning from Xendit (or other top-level GET redirects) still sends the cookie,
 * and same-origin `/api/backend` calls reliably include the session after checkout.
 */
export function rsSessionCookieOptions(req: NextRequest) {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: sessionCookieSecure(req),
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  };
}

/** Clear `rs_session` (attribute shape should match how it was set). */
export function rsSessionClearCookieOptions(req: NextRequest) {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: sessionCookieSecure(req),
    path: "/",
    maxAge: 0,
  };
}
