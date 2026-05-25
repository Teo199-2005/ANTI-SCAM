import { isAllowedMediaFetchUrl } from "@/lib/media/allowedMediaFetchUrl";
import { serverLaravelWebOrigin } from "@/lib/api/laravelApiBase";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Server-side image fetch for the profile crop editor (avoids browser CORS on R2/CDN URLs).
 * Requires an authenticated session cookie.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = req.cookies.get("rs_session")?.value;
  if (!token) {
    return NextResponse.json({ success: false, message: "Not authenticated." }, { status: 401 });
  }

  const rawUrl = req.nextUrl.searchParams.get("url")?.trim();
  if (!rawUrl) {
    return NextResponse.json({ success: false, message: "Missing url parameter." }, { status: 400 });
  }

  const requestHost =
    req.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ??
    req.headers.get("host")?.split(",")[0]?.trim() ??
    null;

  let target: string;
  try {
    if (rawUrl.startsWith("/")) {
      target = `${serverLaravelWebOrigin().replace(/\/$/, "")}${rawUrl}`;
    } else {
      target = rawUrl;
    }
  } catch {
    return NextResponse.json({ success: false, message: "Invalid url." }, { status: 400 });
  }

  if (!isAllowedMediaFetchUrl(target, requestHost)) {
    return NextResponse.json({ success: false, message: "URL not allowed." }, { status: 403 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      headers: { Accept: "image/*,*/*" },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ success: false, message: "Could not fetch image." }, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { success: false, message: `Image unavailable (${upstream.status}).` },
      { status: upstream.status === 404 ? 404 : 502 },
    );
  }

  const headers = new Headers();
  const ct = upstream.headers.get("content-type");
  if (ct) headers.set("Content-Type", ct);
  headers.set("Cache-Control", "private, no-store");

  return new NextResponse(upstream.body, { status: 200, headers });
}
