import { getLaravelWebOrigin } from "@/lib/api/baseUrl";

/**
 * Turn a Laravel `/storage/...` path into an absolute URL for <img src> / next/image.
 */
export function laravelPublicUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const origin = getLaravelWebOrigin();
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}
