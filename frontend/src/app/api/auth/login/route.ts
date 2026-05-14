import { authBffJsonHeaders } from "@/lib/api/authBffProxyHeaders";
import { readBackendResponseJson } from "@/lib/api/backendFetchJson";
import { serverLaravelApiV1BaseUrl } from "@/lib/api/laravelApiBase";
import { shouldAttachLoginProxyDiagnostics } from "@/lib/isLocalDevRequest";
import { NextRequest, NextResponse } from "next/server";
import { rsSessionCookieOptions } from "../sessionCookieSecure";

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
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error(`[auth/login] upstream fetch failed → ${BACKEND}/auth/login (${detail})`);
    return NextResponse.json(
      {
        success: false,
        message:
          "Sign-in could not reach the API from this server. Set LARAVEL_API_BASE_URL to your Laravel /api/v1 base (see frontend/.env.example) and restart Node/PM2.",
        ...loginDevHint(req),
      },
      { status: 502 },
    );
  }

  const { parsed, parseFailed, status } = await readBackendResponseJson(backendRes);

  if (parseFailed) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Sign-in service returned an unexpected response. Check that Laravel is reachable and Nginx routes /api/v1 to PHP.",
        ...loginDevHint(req),
      },
      { status: 502 },
    );
  }

  const payload = parsed as {
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
      { status: status >= 400 ? status : 422 },
    );
  }

  const res = NextResponse.json({ success: true, data: { user: payload.data.user } });

  res.cookies.set("rs_session", payload.data.token, rsSessionCookieOptions(req));

  return res;
}
