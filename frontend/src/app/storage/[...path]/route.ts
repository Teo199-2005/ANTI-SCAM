import { serverLaravelWebOrigin } from "@/lib/api/laravelApiBase";
import fs from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ path: string[] }> };

function guessContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".pdf": "application/pdf",
  };
  return map[ext] ?? "application/octet-stream";
}

/**
 * Serves `GET /storage/*` for uploaded assets (logos, backgrounds, room photos).
 *
 * 1) **Preferred on VPS (same machine as Laravel):** set `LARAVEL_STORAGE_APP_PUBLIC` to the absolute
 *    path of Laravel's `storage/app/public` directory (same files as `public/storage` via
 *    `php artisan storage:link`). No HTTP to PHP is required.
 * 2) **Fallback:** HTTP GET to Laravel web origin derived from `LARAVEL_API_BASE_URL` /
 *    `NEXT_PUBLIC_API_BASE_URL` (see {@link serverLaravelWebOrigin}).
 */
export async function GET(req: NextRequest, context: Ctx): Promise<NextResponse> {
  const { path: segments } = await context.params;
  if (!Array.isArray(segments) || segments.length === 0) {
    return new NextResponse("Not found", { status: 404 });
  }
  if (segments.some((seg) => seg === ".." || seg.includes("\0"))) {
    return new NextResponse("Bad request", { status: 400 });
  }

  const diskRoot = process.env.LARAVEL_STORAGE_APP_PUBLIC?.trim();
  if (diskRoot) {
    const baseResolved = path.resolve(diskRoot);
    const filePath = path.resolve(baseResolved, ...segments);
    if (!filePath.startsWith(baseResolved + path.sep)) {
      return new NextResponse("Bad request", { status: 400 });
    }
    try {
      const data = await fs.readFile(filePath);
      const headers = new Headers();
      headers.set("Content-Type", guessContentType(filePath));
      headers.set("Content-Length", String(data.length));
      headers.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
      return new NextResponse(data, { status: 200, headers });
    } catch (e) {
      const code = e && typeof e === "object" && "code" in e ? String((e as NodeJS.ErrnoException).code) : "";
      if (code !== "ENOENT") {
        console.error("[storage proxy] disk read failed:", filePath, e);
        return new NextResponse("Internal server error", { status: 500 });
      }
      /* fall through to HTTP — file may only exist on another host */
    }
  }

  const relative = segments.map((s) => encodeURIComponent(s)).join("/");
  const origin = serverLaravelWebOrigin().replace(/\/$/, "");
  const upstream = `${origin}/storage/${relative}${req.nextUrl.search}`;

  let upstreamRes: Response;
  try {
    upstreamRes = await fetch(upstream, {
      headers: { Accept: req.headers.get("accept") ?? "*/*" },
      cache: "no-store",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "fetch failed";
    console.error("[storage proxy] upstream fetch failed:", upstream, msg);
    return new NextResponse("Bad gateway", { status: 502 });
  }

  if (!upstreamRes.ok && diskRoot) {
    console.error("[storage proxy] upstream HTTP", upstreamRes.status, upstream, "(disk miss + HTTP fail)");
  }

  const headers = new Headers();
  const ct = upstreamRes.headers.get("content-type");
  if (ct) headers.set("Content-Type", ct);
  const len = upstreamRes.headers.get("content-length");
  if (len) headers.set("Content-Length", len);
  headers.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");

  return new NextResponse(upstreamRes.body, {
    status: upstreamRes.status,
    headers,
  });
}
