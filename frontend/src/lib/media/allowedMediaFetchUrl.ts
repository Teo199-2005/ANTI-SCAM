import { serverLaravelWebOrigin } from "@/lib/api/laravelApiBase";

function addHost(hosts: Set<string>, value: string | undefined): void {
  const v = value?.trim();
  if (!v) return;
  try {
    hosts.add(new URL(v).hostname.toLowerCase());
  } catch {
    // ignore invalid URL env
  }
}

/** Hostnames we may proxy for the profile media editor (R2 CDN, Laravel, public site). */
export function allowedMediaFetchHosts(requestHost?: string | null): Set<string> {
  const hosts = new Set<string>();
  addHost(hosts, process.env.AWS_URL);
  addHost(hosts, process.env.NEXT_PUBLIC_LARAVEL_URL);
  addHost(hosts, serverLaravelWebOrigin());
  const h = requestHost?.split(":")[0]?.trim().toLowerCase();
  if (h) hosts.add(h);
  return hosts;
}

export function isAllowedMediaFetchUrl(url: string, requestHost?: string | null): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return false;
  }

  return allowedMediaFetchHosts(requestHost).has(parsed.hostname.toLowerCase());
}
