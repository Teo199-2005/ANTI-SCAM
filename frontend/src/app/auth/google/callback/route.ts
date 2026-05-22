import { proxyLaravelWebGet } from "@/lib/api/laravelWebProxy";
import { NextRequest } from "next/server";

/**
 * Google redirects here (GOOGLE_REDIRECT_URI). Proxy to Laravel, which issues the SPA token
 * and redirects to /api/auth/google-callback.
 */
export async function GET(req: NextRequest) {
  return proxyLaravelWebGet(req, "/auth/google/callback");
}
