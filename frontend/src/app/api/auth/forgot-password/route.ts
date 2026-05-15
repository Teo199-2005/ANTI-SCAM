import { authBffJsonHeaders } from "@/lib/api/authBffProxyHeaders";
import { serverLaravelApiV1BaseUrl } from "@/lib/api/laravelApiBase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const BACKEND = serverLaravelApiV1BaseUrl();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid request body." }, { status: 400 });
  }

  const email =
    typeof body === "object" && body !== null && "email" in body && typeof (body as { email: unknown }).email === "string"
      ? (body as { email: string }).email
      : undefined;

  let backendRes: Response;
  try {
    backendRes = await fetch(`${BACKEND}/auth/forgot-password`, {
      method: "POST",
      headers: authBffJsonHeaders(req, { emailForRateLimit: email }),
      body: JSON.stringify(body),
    });
  } catch {
    return NextResponse.json({ success: false, message: "API unreachable. Try again." }, { status: 502 });
  }

  const payload = (await backendRes.json()) as {
    success: boolean;
    message?: string;
    data?: { expires_at?: string | null; cooldown_seconds?: number | null; retry_after_seconds?: number | null };
  };

  if (!backendRes.ok || !payload.success) {
    const retryAfter =
      payload.data?.retry_after_seconds ??
      (backendRes.status === 429 ? Number(backendRes.headers.get("Retry-After")) || null : null);
    const message =
      backendRes.status === 429
        ? retryAfter && retryAfter > 0
          ? `Please wait ${retryAfter} seconds before requesting another code.`
          : "Please wait a moment before requesting another code."
        : (payload.message ?? "Could not send reset code.");

    return NextResponse.json(
      {
        success: false,
        message,
        data: retryAfter ? { retry_after_seconds: retryAfter } : undefined,
      },
      { status: backendRes.status || 422 },
    );
  }

  return NextResponse.json({
    success: true,
    message: payload.message,
    data: payload.data ?? {},
  });
}
