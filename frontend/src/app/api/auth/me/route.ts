import { NextRequest, NextResponse } from "next/server";
import { sessionCookieSecure } from "../sessionCookieSecure";

const BACKEND = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("rs_session")?.value;

  if (!token) {
    return NextResponse.json({ success: false, message: "Not authenticated." }, { status: 401 });
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(`${BACKEND}/auth/me`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
  } catch {
    return NextResponse.json({ success: false, message: "API unreachable." }, { status: 502 });
  }

  if (!backendRes.ok) {
    // Token invalid or expired — clear it
    const res = NextResponse.json({ success: false, message: "Session expired." }, { status: 401 });
    res.cookies.set("rs_session", "", {
      httpOnly: true,
      sameSite: "strict",
      secure: sessionCookieSecure(req),
      path: "/",
      maxAge: 0,
    });
    return res;
  }

  const payload = await backendRes.json();
  // Normalise to { user: AuthUser } so AuthContext.refreshUser can read data.data.user
  // (The login BFF wraps the user the same way; /auth/me backend returns the bare user in data)
  const userPayload = payload.data ?? payload;
  return NextResponse.json({ success: true, data: { user: userPayload } });
}
