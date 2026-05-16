/**
 * Room photo uploads: buffer the multipart body once, then POST to Laravel on loopback.
 * Streaming (fetch duplex) often hangs on production Node/nginx; files are ~2 MB after browser compress.
 */
import {
  fetchLaravelUpstream,
  isUpstreamTimeoutError,
  jsonFromNonJsonUpstream,
  jsonUpstreamTimeout,
  rejectPublicLaravelBackendInProduction,
} from "@/lib/api/bffUpstreamResponse";
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

  const backend = serverLaravelApiV1BaseUrl().replace(/\/$/, "");
  const targetUrl = `${backend}/rooms/${encodeURIComponent(roomId)}/images`;

  const misconfig = rejectPublicLaravelBackendInProduction(backend);
  if (misconfig) {
    return misconfig;
  }

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
    const backendRes: Response = await fetchLaravelUpstream(targetUrl, {
      method: "POST",
      headers: forwardHeaders,
      body: bytes,
    });

    const resContentType = backendRes.headers.get("content-type") ?? "";
    if (resContentType.includes("application/json")) {
      const data = await backendRes.json();
      return NextResponse.json(data, { status: backendRes.status });
    }

    const responseBytes = await backendRes.arrayBuffer();
    if (!backendRes.ok) {
      return jsonFromNonJsonUpstream(backendRes.status, responseBytes, "room upload proxy");
    }
    return new NextResponse(responseBytes, {
      status: backendRes.status,
      headers: resContentType ? { "Content-Type": resContentType } : undefined,
    });
  } catch (err) {
    if (isUpstreamTimeoutError(err)) {
      return jsonUpstreamTimeout("room upload proxy");
    }
    const msg = err instanceof Error ? err.message : "Upload proxy failed.";
    console.error(`[room upload proxy] → ${targetUrl}:`, msg);
    return NextResponse.json(
      {
        success: false,
        message:
          "Upload could not reach the API server. Set LARAVEL_API_BASE_URL=http://127.0.0.1:8080/api/v1 in frontend env, run composer install in backend, then pm2 restart --update-env.",
      },
      { status: 502 },
    );
  }
}
