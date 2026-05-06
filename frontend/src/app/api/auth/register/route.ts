import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";

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
      headers: { "Content-Type": "application/json", Accept: "application/json" },
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

  const isSecure = process.env.NODE_ENV === "production";
  const res = NextResponse.json({ success: true, data: { user: payload.data.user } });

  res.cookies.set("rs_session", payload.data.token, {
    httpOnly: true,
    sameSite: "strict",
    secure: isSecure,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return res;
}
