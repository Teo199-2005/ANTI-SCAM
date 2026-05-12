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
 * Turn a Laravel `/storage/...` path into an absolute URL for <img src> / next/image.
 */
export function laravelPublicUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const origin = publicAssetOrigin();
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}
