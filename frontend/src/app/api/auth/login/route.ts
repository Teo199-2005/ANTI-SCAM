import { authBffJsonHeaders } from "@/lib/api/authBffProxyHeaders";
import { serverLaravelApiV1BaseUrl } from "@/lib/api/laravelApiBase";
import { shouldAttachLoginProxyDiagnostics } from "@/lib/isLocalDevRequest";
import { NextRequest, NextResponse } from "next/server";
import { sessionCookieSecure } from "../sessionCookieSecure";

const BACKEND = serverLaravelApiV1BaseUrl();

function loginDevHint(req: NextRequest): { devHint: string } | Record<string, never> {
  if (!shouldAttachLoginProxyDiagnostics(req)) return {};
  return {
    devHint: `BFF → ${BACKEND}/auth/login. If email/password are correct but login fails, the API database may have no demo users: run (from backend/) php artisan db:seed --class=DemoLoginAccountsSeeder. Point the BFF at your API with LARAVEL_API_BASE_URL in frontend/.env.local (e.g. http://127.0.0.1:8000/api/v1).`,
  };
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid request body." }, { status: 400 });
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(`${BACKEND}/auth/login`, {
      method: "POST",
      headers: authBffJsonHeaders(req),
      body: JSON.stringify(body),
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "API unreachable. Try again.", ...loginDevHint(req) },
      { status: 502 },
    );
  }

  const payload = (await backendRes.json()) as {
    success?: boolean;
    message?: string;
    errors?: Record<string, string[]>;
    data?: { token: string; user: unknown };
  };

  const firstValidation =
    payload.errors && typeof payload.errors === "object"
      ? (Object.values(payload.errors).find((v) => Array.isArray(v) && v[0]) as string[] | undefined)?.[0]
      : undefined;

  if (!backendRes.ok || !payload.success || !payload.data?.token) {
    return NextResponse.json(
      {
        success: false,
        message: firstValidation ?? payload.message ?? "Invalid credentials.",
        ...(payload.errors ? { errors: payload.errors } : {}),
        ...loginDevHint(req),
      },
      { status: backendRes.status >= 400 ? backendRes.status : 422 },
    );
  }

  const res = NextResponse.json({ success: true, data: { user: payload.data.user } });

  res.cookies.set("rs_session", payload.data.token, {
    httpOnly: true,
    sameSite: "strict",
    secure: sessionCookieSecure(req),
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return res;
}
