import { readBackendResponseJson } from "@/lib/api/backendFetchJson";
import { serverLaravelApiV1BaseUrl } from "@/lib/api/laravelApiBase";
import { NextRequest, NextResponse } from "next/server";
import { rsSessionClearCookieOptions } from "../sessionCookieSecure";

const BACKEND = serverLaravelApiV1BaseUrl();

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

  const { parsed, parseFailed, status } = await readBackendResponseJson(backendRes);

  if (parseFailed || status >= 500) {
    return NextResponse.json(
      { success: false, message: "Account service is temporarily unavailable. Please try again." },
      { status: 503 },
    );
  }

  if (!backendRes.ok) {
    // Token invalid or expired — clear it
    const res = NextResponse.json({ success: false, message: "Session expired." }, { status: 401 });
    res.cookies.set("rs_session", "", rsSessionClearCookieOptions(req));
    return res;
  }

  const payload = parsed as { data?: unknown };
  // Normalise to { user: AuthUser } so AuthContext.refreshUser can read data.data.user
  // (The login BFF wraps the user the same way; /auth/me backend returns the bare user in data)
  const userPayload = payload.data ?? parsed;
  return NextResponse.json({ success: true, data: { user: userPayload } });
}
