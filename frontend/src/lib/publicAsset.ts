import { getLaravelWebOrigin } from "@/lib/api/baseUrl";

/**
 * On production (real hostname), `/storage/...` is usually served from the same host as the Next app
 * (Nginx → Laravel `public/`). Prefer that origin so previews work even when `NEXT_PUBLIC_LARAVEL_URL`
 * still points at loopback from an old build.
 */
function publicAssetOrigin(): string {
  if (typeof window !== "undefined") {
    const h = window.location.hostname.toLowerCase();
    if (h !== "localhost" && h !== "127.0.0.1" && h !== "[::1]" && !h.endsWith(".localhost")) {
      return window.location.origin.replace(/\/$/, "");
    }
  }
  return getLaravelWebOrigin();
}

/**
 * Turn a Laravel `/storage/...` path or a full `Storage::url()` into an absolute URL for img src.
 * Re-writes absolute URLs whose path is `/storage/...` to {@link publicAssetOrigin} so wrong `APP_URL`
 * in API responses does not break images on the deployed site (img src, etc.).
 */
export function laravelPublicUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) {
    try {
      const u = new URL(path);
      if (u.pathname.startsWith("/storage/")) {
        return `${publicAssetOrigin()}${u.pathname}${u.search}`;
      }
    } catch {
      return path;
    }
    return path;
  }
  const origin = publicAssetOrigin();
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}
