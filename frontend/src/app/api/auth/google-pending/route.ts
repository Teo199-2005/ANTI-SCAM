import { authBffJsonHeaders } from "@/lib/api/authBffProxyHeaders";
import { serverLaravelApiV1BaseUrl } from "@/lib/api/laravelApiBase";
import { NextRequest, NextResponse } from "next/server";

/** Public — used during Google sign-up before a session exists. */
export async function GET(req: NextRequest) {
  const BACKEND = serverLaravelApiV1BaseUrl();
  const googleToken = req.nextUrl.searchParams.get("google_token")?.trim() ?? "";
  if (!googleToken) {
    return NextResponse.json({ success: false, message: "Missing google_token." }, { status: 400 });
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(
      `${BACKEND}/auth/google-pending?google_token=${encodeURIComponent(googleToken)}`,
      {
        method: "GET",
        headers: authBffJsonHeaders(req),
      },
    );
  } catch {
    return NextResponse.json({ success: false, message: "API unreachable. Try again." }, { status: 502 });
  }

  const payload = await backendRes.json();
  return NextResponse.json(payload, { status: backendRes.status });
}
