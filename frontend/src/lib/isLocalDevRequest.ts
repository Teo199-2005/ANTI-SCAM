import type { NextRequest } from "next/server";

/**
 * Whether an incoming Next.js request Host header suggests local / LAN development,
 * so we may safely attach non-sensitive diagnostics (e.g. which Laravel URL the BFF uses).
 */
export function requestHostLooksLikeLocalDev(hostHeader: string | null): boolean {
  const raw = hostHeader?.split(":")[0]?.trim().toLowerCase() ?? "";
  if (raw === "" || raw === "unknown") return false;
  if (raw === "localhost" || raw === "127.0.0.1") return true;
  if (raw.endsWith(".localhost")) return true;
  // Typical Next.js “Network” URL when opening from another device on the same LAN.
  if (/^(10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+)$/.test(raw)) {
    return true;
  }
  return false;
}

export function shouldAttachLoginProxyDiagnostics(req: NextRequest): boolean {
  if (process.env.LOGIN_PROXY_DIAGNOSTICS === "true") return true;
  if (process.env.NODE_ENV === "development") return true;
  if (process.env.VERCEL_ENV === "preview") return true;
  return requestHostLooksLikeLocalDev(req.headers.get("host"));
}
