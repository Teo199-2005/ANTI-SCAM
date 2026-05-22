import type { NextRequest } from "next/server";

/** Public browser origin (anti-scamph.com), not localhost from misconfigured Laravel redirects. */
export function requestPublicOrigin(req: NextRequest): string {
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "").split(",")[0]?.trim();
  const proto = (req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "")).split(",")[0]?.trim();
  if (!host) {
    return req.nextUrl.origin;
  }
  const scheme = proto === "http" || proto === "https" ? proto : "https";
  return `${scheme}://${host}`;
}
