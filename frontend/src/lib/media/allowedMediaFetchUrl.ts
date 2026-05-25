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

function addHostsFromList(hosts: Set<string>, raw: string | undefined): void {
  const list = raw?.trim();
  if (!list) return;
  for (const part of list.split(",")) {
    const token = part.trim().toLowerCase();
    if (!token) continue;
    if (token.includes("://")) {
      addHost(hosts, token);
    } else {
      hosts.add(token.split(":")[0] ?? token);
    }
  }
}

/** Hostnames we may proxy for the profile media editor (R2 CDN, Laravel, public site). */
export function allowedMediaFetchHosts(requestHost?: string | null): Set<string> {
  const hosts = new Set<string>();
  addHost(hosts, process.env.AWS_URL);
  addHost(hosts, process.env.NEXT_PUBLIC_AWS_URL);
  addHost(hosts, process.env.MEDIA_CDN_URL);
  addHost(hosts, process.env.NEXT_PUBLIC_MEDIA_CDN_URL);
  addHostsFromList(hosts, process.env.MEDIA_FETCH_ALLOWED_HOSTS);
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
