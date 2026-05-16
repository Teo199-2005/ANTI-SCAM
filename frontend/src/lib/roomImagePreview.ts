import type { RoomImageRow } from "@/components/dashboard/RoomPhotosPanel";
import { laravelPublicUrl } from "@/lib/publicAsset";

/** Room image reference from public landing or guest catalog APIs. */
export type RoomImageRef = {
  id: number;
  url?: string;
  broken?: boolean;
};

/** Normalize legacy string URLs and new `{ id, url }` objects from the API. */
export function normalizeRoomImages(
  images: readonly (string | RoomImageRef)[] | undefined | null,
): RoomImageRef[] {
  if (!images?.length) return [];

  return images
    .map((item): RoomImageRef | null => {
      if (typeof item === "string") {
        const url = item.trim();
        return url ? { id: 0, url } : null;
      }
      if (item.broken) return null;
      if (item.id > 0) return { id: item.id, url: item.url };
      const url = item.url?.trim();
      return url ? { id: 0, url } : null;
    })
    .filter((x): x is RoomImageRef => x !== null);
}

export type RoomImageAccess = "public" | "session";

/**
 * Display URL for room photos in modals and tiles.
 * Prefer authenticated BFF stream on dashboard/guest; public stream on resort landing.
 */
export function roomImageDisplaySrc(
  roomId: number,
  image: RoomImageRef,
  access: RoomImageAccess = "public",
): string {
  if (image.broken) return "";

  const publicUrl = image.url?.trim() ?? "";
  if (publicUrl.startsWith("https://") || publicUrl.startsWith("http://")) {
    return publicUrl;
  }

  if (image.id > 0) {
    const base =
      access === "session"
        ? `/api/backend/rooms/${roomId}/images/${image.id}/file`
        : `/api/public/public/rooms/${roomId}/images/${image.id}/file`;
    return base;
  }

  return laravelPublicUrl(image.url);
}

/**
 * Dashboard preview URL — streams through the authenticated BFF.
 */
export function roomImagePreviewSrc(
  roomId: number,
  image: Pick<RoomImageRow, "id" | "url" | "broken">,
): string {
  if (image.broken) {
    return "";
  }

  const publicUrl = image.url?.trim() ?? "";
  if (publicUrl.startsWith("https://") || publicUrl.startsWith("http://")) {
    return publicUrl;
  }

  return `/api/backend/rooms/${roomId}/images/${image.id}/file`;
}
