import { authBffJsonHeaders } from "@/lib/api/authBffProxyHeaders";
import { serverLaravelApiV1BaseUrl } from "@/lib/api/laravelApiBase";
import { NextRequest, NextResponse } from "next/server";
import { sessionCookieSecure } from "../sessionCookieSecure";

const BACKEND = serverLaravelApiV1BaseUrl();

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid request body." }, { status: 400 });
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(`${BACKEND}/auth/register`, {
      method: "POST",
      headers: authBffJsonHeaders(req),
      body: JSON.stringify(body),
    });
  } catch {
    return NextResponse.json({ success: false, message: "API unreachable. Try again." }, { status: 502 });
  }

  const payload = (await backendRes.json()) as {
    success: boolean;
    message?: string;
    data?: { token: string; user: unknown };
  };

  if (!backendRes.ok || !payload.success || !payload.data?.token) {
    return NextResponse.json(
      { success: false, message: payload.message ?? "Registration failed." },
      { status: backendRes.status || 422 },
    );
  }

  const res = NextResponse.json({ success: true, data: { user: payload.data.user } });

  res.cookies.set("rs_session", payload.data.token, {
    httpOnly: true,
    sameSite: "strict",
    secure: sessionCookieSecure(req),
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return res;
}
