import { NextRequest, NextResponse } from "next/server";

/**
 * Production apex domain (no protocol), e.g. anti-scamph.com.
 * When set, `{tenant}.{root}` is rewritten to `/resort/{tenant}` (optional; needs wildcard DNS).
 * Shareable links use `{apex}/resort/{tenant}` so owners work without `*.{root}` DNS.
 * If unset, only `*.localhost` is treated as tenant hosts (local dev).
 */
const ROOT_DOMAIN_CONFIG = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim().toLowerCase() ?? "";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const pathname = request.nextUrl.pathname;

  // Legacy `/stay/{slug}` → `/resort/{slug}` (permanent)
  if (pathname === "/stay" || pathname.startsWith("/stay/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/^\/stay/, "/resort");
    return NextResponse.redirect(url, 308);
  }

  // Dashboard, auth API, and BFF must never be rewritten to /resort/{tenant}/...
  // (otherwise e.g. tenant.localhost/dashboard/resort → 404 after payment redirect).
  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/storage")
  ) {
    return NextResponse.next();
  }

  // Root-level files from `public/` (e.g. `/rising2brothers.png`) must not be rewritten to
  // `/resort/{tenant}/...` on `*.localhost` / tenant subdomains — that breaks `<img src="/...">`.
  const pathSegments = pathname.split("/").filter(Boolean);
  if (
    pathSegments.length === 1 &&
    /\.(png|jpe?g|gif|webp|svg|ico|txt|xml|pdf|map|webmanifest|woff2?|ttf|eot)$/i.test(pathSegments[0] ?? "")
  ) {
    return NextResponse.next();
  }

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
  const originalPath = pathname === "/" ? "" : pathname;
  // Singular /resort/... avoids collision with marketing /resorts/[id] (catalog).
  url.pathname = `/resort/${subdomain}${originalPath}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
