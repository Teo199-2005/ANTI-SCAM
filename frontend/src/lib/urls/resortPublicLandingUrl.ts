function isLoopbackHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

/**
 * Shareable URL for a resort’s public landing (owner profile “Copy link”, etc.).
 *
 * - **Local dev:** `http://{tenant}.localhost:{port}` — matches `middleware.ts` tenant routing.
 * - **Deployed:** `{origin}/resort/{tenant}` — works with only an apex DNS record; no `*.{root}` wildcard required.
 */
export function resortPublicLandingPageUrl(subdomain: string): string {
  if (typeof window === "undefined") return "";
  const tenant = subdomain.trim();
  if (!tenant) return "";
  const { protocol, hostname, port } = window.location;
  const portPart = port ? `:${port}` : "";
  if (isLoopbackHostname(hostname)) {
    return `${protocol}//${encodeURIComponent(tenant)}.localhost${portPart}`;
  }
  const origin = `${protocol}//${hostname}${portPart}`.replace(/\/+$/, "");
  return `${origin}/resort/${encodeURIComponent(tenant)}`;
}
