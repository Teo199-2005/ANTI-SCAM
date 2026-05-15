import { serverLaravelApiV1BaseUrl } from "@/lib/api/laravelApiBase";
import { NextRequest, NextResponse } from "next/server";

type Ctx = { params: Promise<{ path: string[] }> };

/**
 * Xendit (and other server-to-server) webhooks hit the public site at /api/v1/webhooks/*.
 * Production nginx often proxies only to Next.js — this route forwards to Laravel.
 */
async function proxyWebhook(req: NextRequest, context: Ctx): Promise<NextResponse> {
  const backend = serverLaravelApiV1BaseUrl().replace(/\/$/, "");
  const { path } = await context.params;
  const segments = Array.isArray(path) ? path : [];
  if (segments.length === 0) {
    return NextResponse.json(
      { success: false, message: "Missing path after /api/v1/webhooks." },
      { status: 400 },
    );
  }

  const targetUrl = `${backend}/webhooks/${segments.join("/")}`;

  const forwardHeaders: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": req.headers.get("content-type") ?? "application/json",
  };

  const callbackToken = req.headers.get("x-callback-token");
  if (callbackToken) {
    forwardHeaders["x-callback-token"] = callbackToken;
  }

  const body = await req.text();

  let backendRes: Response;
  try {
    backendRes = await fetch(targetUrl, {
      method: "POST",
      headers: forwardHeaders,
      body: body || undefined,
      cache: "no-store",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "fetch failed";
    console.error("[api/v1/webhooks proxy] fetch error →", targetUrl, msg);
    return NextResponse.json({ success: false, message: "Backend unreachable." }, { status: 502 });
  }

  const contentType = backendRes.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  }

  const text = await backendRes.text();
  return new NextResponse(text, {
    status: backendRes.status,
    headers: { "Content-Type": contentType || "text/plain" },
  });
}

export async function POST(req: NextRequest, ctx: Ctx) {
  return proxyWebhook(req, ctx);
}
