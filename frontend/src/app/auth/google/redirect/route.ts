import { proxyLaravelWebGet } from "@/lib/api/laravelWebProxy";
import { NextRequest } from "next/server";

/**
 * Public site proxies Google OAuth start to Laravel (web.php /auth/google/redirect).
 */
export async function GET(req: NextRequest) {
  return proxyLaravelWebGet(req, "/auth/google/redirect");
}
