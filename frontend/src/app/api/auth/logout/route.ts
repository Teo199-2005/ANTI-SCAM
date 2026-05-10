import { serverLaravelApiV1BaseUrl } from "@/lib/api/laravelApiBase";
import { NextRequest, NextResponse } from "next/server";
import { sessionCookieSecure } from "../sessionCookieSecure";

const BACKEND = serverLaravelApiV1BaseUrl();

export async function POST(req: NextRequest) {
  const token = req.cookies.get("rs_session")?.value;

  // Fire-and-forget: revoke the backend token if we have it
  if (token) {
    try {
      await fetch(`${BACKEND}/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
    } catch {
      // Always clear the cookie regardless of backend availability
    }
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set("rs_session", "", {
    httpOnly: true,
    sameSite: "strict",
    secure: sessionCookieSecure(req),
    path: "/",
    maxAge: 0,
  });

  return res;
}
