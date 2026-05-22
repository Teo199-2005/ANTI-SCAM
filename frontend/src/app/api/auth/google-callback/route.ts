/**
 * Google OAuth BFF callback handler.
 *
 * The Laravel backend redirects here with ?token=... after a successful Google sign-in.
 * This route sets the httpOnly session cookie and redirects the user to the dashboard.
 * The raw token is NEVER exposed to JavaScript — it transitions straight from URL param
 * to httpOnly cookie and then the URL is replaced.
 */
import { requestPublicOrigin } from "@/lib/api/requestPublicOrigin";
import { NextRequest, NextResponse } from "next/server";
import { rsSessionCookieOptions } from "../sessionCookieSecure";

export async function GET(req: NextRequest) {
  const origin = requestPublicOrigin(req);
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=oauth_failed", origin));
  }

  const rawRedirect = req.nextUrl.searchParams.get("redirect")?.trim() ?? "";
  const safeRedirect =
    rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") ? rawRedirect : "/dashboard";
  const res = NextResponse.redirect(new URL(safeRedirect, origin));

  res.cookies.set("rs_session", token, rsSessionCookieOptions(req));

  return res;
}
