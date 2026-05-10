import { serverLaravelApiV1BaseUrl } from "@/lib/api/laravelApiBase";
import { requestHostLooksLikeLocalDev } from "@/lib/isLocalDevRequest";
import { NextRequest, NextResponse } from "next/server";

/** Local/LAN-only — exposes which Laravel root the BFF uses (for debugging demo login). */
export async function GET(req: NextRequest) {
  if (!requestHostLooksLikeLocalDev(req.headers.get("host"))) {
    return new NextResponse(null, { status: 404 });
  }

  return NextResponse.json({ laravelApiV1: serverLaravelApiV1BaseUrl() });
}
