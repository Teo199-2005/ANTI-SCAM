import { NextRequest, NextResponse } from "next/server";

/**
 * Production apex domain (no protocol), e.g. anti-scamph.com.
 * Required for `{tenant}.anti-scamph.com` → `/resorts/{tenant}` routing.
 * If unset, only `*.localhost` is treated as tenant hosts (local dev).
 */
const ROOT_DOMAIN_CONFIG = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim().toLowerCase() ?? "";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";

  // Strip port for comparison
  const hostname = host.split(":")[0].toLowerCase();

  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";
  if (isLocalhost) {
    return NextResponse.next();
  }

  let subdomain: string | null = null;

  if (ROOT_DOMAIN_CONFIG) {
    if (hostname === ROOT_DOMAIN_CONFIG || hostname === `www.${ROOT_DOMAIN_CONFIG}`) {
      return NextResponse.next();
    }
    const suffix = `.${ROOT_DOMAIN_CONFIG}`;
    if (hostname.endsWith(suffix)) {
      const sub = hostname.slice(0, -suffix.length);
      if (sub && !sub.includes(".")) {
        subdomain = sub;
      }
    }
  } else if (hostname.endsWith(".localhost")) {
    const sub = hostname.slice(0, -".localhost".length);
    if (sub && !sub.includes(".")) {
      subdomain = sub;
    }
  }

  if (!subdomain) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  const originalPath = url.pathname === "/" ? "" : url.pathname;
  url.pathname = `/resorts/${subdomain}${originalPath}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
