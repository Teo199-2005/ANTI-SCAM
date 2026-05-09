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
    backendRes = await fetch(`${BACKEND}/auth/forgot-password`, {
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
    data?: { expires_at?: string | null; cooldown_seconds?: number | null };
  };

  if (!backendRes.ok || !payload.success) {
    return NextResponse.json(
      { success: false, message: payload.message ?? "Could not send reset code." },
      { status: backendRes.status || 422 },
    );
  }

  return NextResponse.json({
    success: true,
    message: payload.message,
    data: payload.data ?? {},
  });
}
