import { ROOM_PHOTO_UPLOAD_UI_VERSION } from "@/lib/uploadUiVersion";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    {
      ok: true,
      roomPhotoUploadUi: ROOM_PHOTO_UPLOAD_UI_VERSION,
      features: ["compress-2mb", "streaming-upload-proxy", "sequential-files"],
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
