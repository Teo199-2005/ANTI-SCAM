import {
  fetchLaravelUpstream,
  isUpstreamTimeoutError,
  jsonUpstreamTimeout,
  rejectPublicLaravelBackendInProduction,
} from "@/lib/api/bffUpstreamResponse";
import { serverLaravelWebOrigin } from "@/lib/api/laravelApiBase";
import { NextRequest, NextResponse } from "next/server";

const FORWARD_REQUEST_HEADERS = ["cookie", "accept", "accept-language", "user-agent"] as const;

const FORWARD_RESPONSE_HEADERS = ["location", "content-type", "cache-control"] as const;

/**
 * Proxy a GET to Laravel web routes (OAuth, etc.) when the public site only hits Next.js.
 */
export async function proxyLaravelWebGet(
  req: NextRequest,
  laravelPath: string,
): Promise<NextResponse> {
  const base = serverLaravelWebOrigin().replace(/\/$/, "");
  const path = laravelPath.startsWith("/") ? laravelPath : `/${laravelPath}`;
  const search = req.nextUrl.search;
  const targetUrl = `${base}${path}${search}`;

  const misconfig = rejectPublicLaravelBackendInProduction(base);
  if (misconfig) {
    return misconfig;
  }

  const forwardHeaders: Record<string, string> = {};
  for (const name of FORWARD_REQUEST_HEADERS) {
    const value = req.headers.get(name);
    if (value) {
      forwardHeaders[name] = value;
    }
  }
  const host = req.headers.get("host");
  if (host) {
    forwardHeaders["x-forwarded-host"] = host;
  }
  const proto = req.nextUrl.protocol.replace(":", "");
  if (proto) {
    forwardHeaders["x-forwarded-proto"] = proto;
  }

  let upstream: Response;
  try {
    upstream = await fetchLaravelUpstream(targetUrl, {
      method: "GET",
      headers: forwardHeaders,
      redirect: "manual",
      cache: "no-store",
    });
  } catch (err) {
    if (isUpstreamTimeoutError(err)) {
      return jsonUpstreamTimeout("laravelWebProxy");
    }
    console.error("[laravelWebProxy] fetch error →", targetUrl, err);
    return NextResponse.json(
      {
        success: false,
        message:
          "Google sign-in backend is unreachable. Ensure LARAVEL_API_BASE_URL points to loopback Laravel (e.g. http://127.0.0.1:8080/api/v1) and nginx serves PHP on :8080.",
      },
      { status: 502 },
    );
  }

  const res = new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
  });

  for (const name of FORWARD_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) {
      res.headers.set(name, value);
    }
  }

  const setCookies =
    typeof upstream.headers.getSetCookie === "function"
      ? upstream.headers.getSetCookie()
      : [];
  if (setCookies.length > 0) {
    for (const cookie of setCookies) {
      res.headers.append("set-cookie", cookie);
    }
  } else {
    const single = upstream.headers.get("set-cookie");
    if (single) {
      res.headers.append("set-cookie", single);
    }
  }

  return res;
}
