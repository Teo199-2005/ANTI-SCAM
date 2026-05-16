/**
 * Room photo uploads: buffer the multipart body once, then POST to Laravel on loopback.
 * Streaming (fetch duplex) often hangs on production Node/nginx; files are ~2 MB after browser compress.
 */
import { serverLaravelApiV1BaseUrl } from "@/lib/api/laravelApiBase";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 180;
export const runtime = "nodejs";

const UPSTREAM_TIMEOUT_MS = 120_000;

type RouteContext = { params: Promise<{ roomId: string }> };

export async function POST(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  const token = req.cookies.get("rs_session")?.value;
  if (!token) {
    return NextResponse.json({ success: false, message: "Not authenticated." }, { status: 401 });
  }

  const { roomId } = await context.params;
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { success: false, message: "Expected a multipart image upload." },
      { status: 400 },
    );
  }

  const backend = serverLaravelApiV1BaseUrl().replace(/\/$/, "");
  const targetUrl = `${backend}/rooms/${encodeURIComponent(roomId)}/images`;

  if (backend.includes("anti-scamph.com") && !backend.includes("127.0.0.1") && !backend.includes("localhost")) {
    console.warn(
      `[room upload proxy] LARAVEL_API_BASE_URL points at public host (${backend}). ` +
        "Set LARAVEL_API_BASE_URL=http://127.0.0.1:8000/api/v1 (or :8080) in frontend env and pm2 restart --update-env.",
    );
  }

  let bytes: ArrayBuffer;
  try {
    bytes = await req.arrayBuffer();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not read upload body.";
    console.error("[room upload proxy] body read failed:", msg);
    return NextResponse.json({ success: false, message: "Upload body was not received." }, { status: 400 });
  }

  if (bytes.byteLength === 0) {
    return NextResponse.json({ success: false, message: "Empty upload body." }, { status: 400 });
  }

  const forwardHeaders: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: req.headers.get("accept") ?? "application/json",
    "Content-Type": contentType,
    "Content-Length": String(bytes.byteLength),
  };

  try {
    const backendRes = await fetch(targetUrl, {
      method: "POST",
      headers: forwardHeaders,
      body: bytes,
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });

    const resContentType = backendRes.headers.get("content-type") ?? "";
    if (resContentType.includes("application/json")) {
      const data = await backendRes.json();
      return NextResponse.json(data, { status: backendRes.status });
    }

    const text = await backendRes.text();
    if (!backendRes.ok) {
      console.error(`[room upload proxy] ${backendRes.status} from ${targetUrl}:`, text.slice(0, 500));
    }
    return new NextResponse(text, {
      status: backendRes.status,
      headers: resContentType ? { "Content-Type": resContentType } : undefined,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upload proxy failed.";
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    console.error(`[room upload proxy] → ${targetUrl}:`, msg);
    return NextResponse.json(
      {
        success: false,
        message: timedOut
          ? "Saving the photo on the server timed out. Check R2 credentials (php artisan media:verify), PHP-FPM, and that LARAVEL_API_BASE_URL uses 127.0.0.1 on the VPS."
          : "Upload could not reach the API server. Set LARAVEL_API_BASE_URL=http://127.0.0.1:8000/api/v1 in frontend env, run composer install in backend, then pm2 restart --update-env.",
      },
      { status: timedOut ? 504 : 502 },
    );
  }
}
