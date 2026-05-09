/**
 * Turn a Laravel `/storage/...` path into an absolute URL for <img src> / next/image.
 */
export function laravelPublicUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";
  const origin = apiBase.replace(/\/api\/v1\/?$/i, "");
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}
