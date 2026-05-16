/**
 * Generic BFF proxy — forwards all /api/backend/* requests to the Laravel backend,
 * injecting the httpOnly session token as Authorization: Bearer.
 *
 * This keeps the auth token exclusively server-side (httpOnly cookie) while allowing
 * the React SPA to make authenticated requests without ever touching the token directly.
 */
import { jsonFromNonJsonUpstream } from "@/lib/api/bffUpstreamResponse";
import { serverLaravelApiV1BaseUrl } from "@/lib/api/laravelApiBase";
import { NextRequest, NextResponse } from "next/server";

/** Room/logo multipart can exceed default serverless limits on some hosts. */
export const maxDuration = 180;

type RouteContext = { params: Promise<{ path: string[] }> };

async function proxy(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  const BACKEND = serverLaravelApiV1BaseUrl().replace(/\/$/, "");
  const resolved = await context.params;
  const rawPath = resolved?.path;
  const segments = Array.isArray(rawPath) ? rawPath : rawPath != null ? [String(rawPath)] : [];
  if (segments.length === 0) {
    return NextResponse.json(
      {
        success: false,
        message: "Missing API path after /api/backend (e.g. /api/backend/rooms).",
      },
      { status: 400 },
    );
  }

  const token = req.cookies.get("rs_session")?.value;

  if (!token) {
    return NextResponse.json({ success: false, message: "Not authenticated." }, { status: 401 });
  }

  const targetPath = `/${segments.join("/")}`;
  const search = req.nextUrl.searchParams.toString();
  const targetUrl = `${BACKEND}${targetPath}${search ? `?${search}` : ""}`;

  const reqContentType = req.headers.get("content-type") ?? "";
  const isMultipart = reqContentType.includes("multipart/form-data");

  const forwardHeaders: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: req.headers.get("accept") ?? "application/json",
  };

  const browserOrigin = req.headers.get("origin");
  if (browserOrigin) {
    forwardHeaders.Origin = browserOrigin;
  }

  // Preserve multipart boundary by forwarding the original content-type.
  // Reconstructing formData() in the proxy can corrupt file uploads.
  if (reqContentType && !["GET", "HEAD"].includes(req.method)) {
    forwardHeaders["Content-Type"] = reqContentType;
  }

  let body: BodyInit | null = null;
  if (!["GET", "HEAD"].includes(req.method)) {
    if (isMultipart) {
      // Buffer multipart end-to-end. Streaming `req.body` with `duplex: "half"` often
      // yields truncated bodies → Laravel reports "images.0 failed to upload" (invalid tmp file).
      const bytes = await req.arrayBuffer();
      body = bytes.byteLength === 0 ? null : bytes;
      if (body) {
        forwardHeaders["Content-Length"] = String(bytes.byteLength);
      }
    } else {
      body = await req.text();
    }
  }

  let backendRes: Response;
  try {
    const fetchInit: RequestInit = {
      method: req.method,
      headers: forwardHeaders,
      body: body ?? undefined,
    };

    backendRes = await fetch(targetUrl, {
      ...fetchInit,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Backend unreachable.";
    console.error(`[BFF proxy] fetch error → ${targetUrl}:`, msg);
    return NextResponse.json({ success: false, message: "Backend unreachable. Is the API server running?" }, { status: 502 });
  }

  const contentType = backendRes.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const data = await backendRes.json();
    // Log non-200 responses to help debug issues in development
    if (!backendRes.ok && process.env.NODE_ENV !== "production") {
      console.warn(`[BFF proxy] ${req.method} ${targetPath} → ${backendRes.status}`, JSON.stringify(data));
    }
    return NextResponse.json(data, { status: backendRes.status });
  }

  // Non-JSON response (binary streams, HTML error pages, etc.)
  const bytes = await backendRes.arrayBuffer();
  if (!backendRes.ok) {
    return jsonFromNonJsonUpstream(backendRes.status, bytes, "BFF proxy");
  }

  const headers = new Headers();
  if (contentType) {
    headers.set("Content-Type", contentType);
  }
  const len = backendRes.headers.get("content-length");
  if (len) {
    headers.set("Content-Length", len);
  }
  headers.set("Cache-Control", "private, max-age=3600");

  return new NextResponse(bytes, {
    status: backendRes.status,
    headers,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
