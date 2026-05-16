import { serverLaravelApiV1BaseUrl } from "@/lib/api/laravelApiBase";
import { NextRequest, NextResponse } from "next/server";

type Ctx = { params: Promise<{ path: string[] }> };

/**
 * Unauthenticated BFF proxy for Laravel routes under `/api/v1/*` (public catalog, referrals, etc.).
 * Browser `publicClient` uses `/api/public/...` so production works without nginx exposing `/api/v1`.
 */
async function proxy(req: NextRequest, context: Ctx, method: string): Promise<NextResponse> {
  const BACKEND = serverLaravelApiV1BaseUrl().replace(/\/$/, "");
  const { path } = await context.params;
  const segments = Array.isArray(path) ? path : [];
  if (segments.length === 0) {
    return NextResponse.json(
      { success: false, message: "Missing path after /api/public (e.g. /api/public/public/rooms/1)." },
      { status: 400 },
    );
  }

  const targetPath = `/${segments.join("/")}`;
  const search = req.nextUrl.searchParams.toString();
  const targetUrl = `${BACKEND}${targetPath}${search ? `?${search}` : ""}`;

  let body: BodyInit | null = null;
  if (!["GET", "HEAD"].includes(method)) {
    const reqCt = req.headers.get("content-type") ?? "";
    if (reqCt.includes("application/json")) {
      body = await req.text();
    } else {
      body = await req.arrayBuffer();
    }
  }

  const forwardHeaders: Record<string, string> = { Accept: "application/json" };
  const reqCt = req.headers.get("content-type");
  if (reqCt && !["GET", "HEAD"].includes(method)) {
    forwardHeaders["Content-Type"] = reqCt;
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(targetUrl, {
      method,
      headers: forwardHeaders,
      body: body ?? undefined,
      cache: "no-store",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "fetch failed";
    console.error("[api/public proxy] fetch error →", targetUrl, msg);
    return NextResponse.json({ success: false, message: "Backend unreachable." }, { status: 502 });
  }

  const contentType = backendRes.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  }

  const bytes = await backendRes.arrayBuffer();
  if (!backendRes.ok) {
    const text = new TextDecoder().decode(bytes.slice(0, 2048));
    return NextResponse.json(
      { success: false, message: text.slice(0, 200) || `Server error (${backendRes.status}).` },
      { status: backendRes.status },
    );
  }

  const headers = new Headers();
  if (contentType) {
    headers.set("Content-Type", contentType);
  }
  const len = backendRes.headers.get("content-length");
  if (len) {
    headers.set("Content-Length", len);
  }
  headers.set("Cache-Control", "public, max-age=3600");

  return new NextResponse(bytes, {
    status: backendRes.status,
    headers,
  });
}

export async function GET(req: NextRequest, ctx: Ctx) {
  return proxy(req, ctx, "GET");
}

export async function POST(req: NextRequest, ctx: Ctx) {
  return proxy(req, ctx, "POST");
}
