import { serverLaravelWebOrigin } from "@/lib/api/laravelApiBase";
import { existsSync } from "fs";
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
 * Laravel `storage/app/public` on a typical VPS monorepo (`.../anti-scam/frontend` + `.../anti-scam/backend`).
 * Override with `LARAVEL_STORAGE_APP_PUBLIC` when layout differs.
 */
function resolveDiskStorageRoot(): string | null {
  const explicit = process.env.LARAVEL_STORAGE_APP_PUBLIC?.trim();
  if (explicit) {
    if (existsSync(explicit)) {
      return path.resolve(explicit);
    }
    console.warn("[storage proxy] LARAVEL_STORAGE_APP_PUBLIC is set but path not found:", explicit);
  }

  const siblingBackend = path.resolve(process.cwd(), "../backend/storage/app/public");
  if (existsSync(siblingBackend)) {
    return siblingBackend;
  }

  const backendFromRepoRoot = path.resolve(process.cwd(), "backend/storage/app/public");
  if (existsSync(backendFromRepoRoot)) {
    return backendFromRepoRoot;
  }

  return null;
}

/** Avoid fetch() to the same host as this request — that recurses through nginx and returns 500. */
function upstreamWouldLoopBackToThisSite(req: NextRequest, upstreamUrl: string): boolean {
  try {
    const u = new URL(upstreamUrl);
    const rawHost =
      req.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ??
      req.headers.get("host")?.split(",")[0]?.trim() ??
      "";
    const requestHost = rawHost.split(":")[0]?.toLowerCase() ?? "";
    return Boolean(requestHost) && u.hostname.toLowerCase() === requestHost;
  } catch {
    return false;
  }
}

/**
 * Serves `GET /storage/*` for uploaded assets (logos, backgrounds, room photos).
 *
 * 1) **Disk (VPS):** `LARAVEL_STORAGE_APP_PUBLIC`, or auto `../backend/storage/app/public` from the
 *    Next working directory (no HTTP to PHP).
 * 2) **Fallback:** HTTP GET to Laravel web origin from `LARAVEL_API_BASE_URL` / `NEXT_PUBLIC_API_BASE_URL`
 *    (only when disk root is unknown — never same-host fetch to avoid recursion).
 */
export async function GET(req: NextRequest, context: Ctx): Promise<NextResponse> {
  const { path: segments } = await context.params;
  if (!Array.isArray(segments) || segments.length === 0) {
    return new NextResponse("Not found", { status: 404 });
  }
  if (segments.some((seg) => seg === ".." || seg.includes("\0"))) {
    return new NextResponse("Bad request", { status: 400 });
  }

  const diskRoot = resolveDiskStorageRoot();
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
      return new NextResponse(new Uint8Array(data), { status: 200, headers });
    } catch (e) {
      const code = e && typeof e === "object" && "code" in e ? String((e as NodeJS.ErrnoException).code) : "";
      if (code === "ENOENT") {
        return new NextResponse("Not found", { status: 404 });
      }
      console.error("[storage proxy] disk read failed:", filePath, e);
      return new NextResponse("Internal server error", { status: 500 });
    }
  }

  const relative = segments.map((s) => encodeURIComponent(s)).join("/");
  const origin = serverLaravelWebOrigin().replace(/\/$/, "");
  const upstream = `${origin}/storage/${relative}${req.nextUrl.search}`;

  if (upstreamWouldLoopBackToThisSite(req, upstream)) {
    console.error(
      "[storage proxy] misconfigured: Laravel origin matches public site host; disk root not found (cwd=%s). Set LARAVEL_STORAGE_APP_PUBLIC or run PM2 with cwd=.../frontend.",
      process.cwd(),
    );
    return new NextResponse(
      "Storage unavailable: set LARAVEL_STORAGE_APP_PUBLIC to Laravel storage/app/public, or fix PM2 cwd so ../backend/storage/app/public exists.",
      { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

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

  if (!upstreamRes.ok) {
    console.error(
      "[storage proxy] miss HTTP",
      upstreamRes.status,
      upstream,
      "cwd=",
      process.cwd(),
      "diskRoot=",
      "(none)",
    );
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
