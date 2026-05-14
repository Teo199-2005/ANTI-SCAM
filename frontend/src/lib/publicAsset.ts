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
 * Turn a Laravel `/storage/...` path or a full `Storage::url()` into a URL for img `src`.
 *
 * **Storage (`/storage/...`):** returns a **same-origin relative** path (e.g. `/storage/rooms/1/x.jpg`) so
 * the Next.js `/storage` route handler can proxy files and **SSR + client hydration always match**
 * (avoids `publicAssetOrigin()` differing: server uses Laravel origin, browser may use
 * `window.location.origin` on some hosts).
 *
 * **Absolute HTTPS URLs** (e.g. Cloudflare R2 public domain): returned unchanged for `img src`.
 *
 * **Other paths / full URLs:** still resolved with {@link publicAssetOrigin} where applicable.
 */
export function laravelPublicUrl(path: string | null | undefined): string {
  if (!path) return "";

  if (path.startsWith("http://") || path.startsWith("https://")) {
    try {
      const u = new URL(path);
      if (u.pathname.startsWith("/storage/")) {
        return `${u.pathname}${u.search}`;
      }
    } catch {
      return path;
    }
    return path;
  }

  const rel = path.startsWith("/") ? path : `/${path}`;
  if (rel.startsWith("/storage/")) {
    return rel;
  }

  const origin = publicAssetOrigin();
  return `${origin}${rel}`;
}
