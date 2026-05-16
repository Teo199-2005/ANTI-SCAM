/**
 * Streams multipart room-photo uploads to Laravel without buffering the full body in memory.
 * The generic /api/backend proxy uses arrayBuffer() which is slow on production and breaks
 * upload progress perception; this route forwards the raw body with fetch duplex streaming.
 */
import { serverLaravelApiV1BaseUrl } from "@/lib/api/laravelApiBase";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 180;
export const runtime = "nodejs";

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

  if (!req.body) {
    return NextResponse.json({ success: false, message: "Empty upload body." }, { status: 400 });
  }

  const backend = serverLaravelApiV1BaseUrl().replace(/\/$/, "");
  const targetUrl = `${backend}/rooms/${encodeURIComponent(roomId)}/images`;

  const forwardHeaders: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: req.headers.get("accept") ?? "application/json",
    "Content-Type": contentType,
  };
  const contentLength = req.headers.get("content-length");
  if (contentLength) {
    forwardHeaders["Content-Length"] = contentLength;
  }

  try {
    const backendRes = await fetch(targetUrl, {
      method: "POST",
      headers: forwardHeaders,
      body: req.body,
      // Required when streaming a request body in Node fetch
      duplex: "half",
    } as RequestInit);

    const resContentType = backendRes.headers.get("content-type") ?? "";
    if (resContentType.includes("application/json")) {
      const data = await backendRes.json();
      return NextResponse.json(data, { status: backendRes.status });
    }

    const text = await backendRes.text();
    if (!backendRes.ok) {
      console.error(`[room upload proxy] ${backendRes.status} non-JSON from ${targetUrl}:`, text.slice(0, 500));
    }
    return new NextResponse(text, {
      status: backendRes.status,
      headers: resContentType ? { "Content-Type": resContentType } : undefined,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upload proxy failed.";
    console.error(`[room upload proxy] → ${targetUrl}:`, msg);
    return NextResponse.json(
      {
        success: false,
        message:
          "Upload could not reach the API server. On the VPS, set LARAVEL_API_BASE_URL to http://127.0.0.1:8000/api/v1 (or :8080) and restart the frontend.",
      },
      { status: 502 },
    );
  }
}
