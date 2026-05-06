import { NextRequest, NextResponse } from "next/server";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";

  // Strip port for comparison
  const hostname = host.split(":")[0];

  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";
  const isRootDomain = hostname === ROOT_DOMAIN || hostname === `www.${ROOT_DOMAIN}`;

  if (isLocalhost || isRootDomain) {
    return NextResponse.next();
  }

  // Check for a subdomain (e.g. beachparadise.resortstaycation.com)
  const rootParts = ROOT_DOMAIN.split(".");
  const hostParts = hostname.split(".");

  if (hostParts.length > rootParts.length) {
    const subdomain = hostParts[0];
    const url = request.nextUrl.clone();
    const originalPath = url.pathname === "/" ? "" : url.pathname;
    url.pathname = `/resorts/${subdomain}${originalPath}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
