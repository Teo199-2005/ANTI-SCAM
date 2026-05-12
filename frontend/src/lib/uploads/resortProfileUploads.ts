/** Matches Laravel `max` on uploads (kilobytes) — keep in sync with ResortLandingPageController / AdminOnboardController. */
export const RESORT_LOGO_MAX_BYTES = 12 * 1024 * 1024;
export const RESORT_BACKGROUND_MAX_BYTES = 25 * 1024 * 1024;
/** Room gallery uploads — matches RoomImageController `max` (KB, 25600 = 25 MB). */
export const RESORT_ROOM_PHOTO_MAX_BYTES = 25 * 1024 * 1024;

/** Whole MB for UI copy. */
export const RESORT_ROOM_PHOTO_MAX_MB = Math.floor(RESORT_ROOM_PHOTO_MAX_BYTES / (1024 * 1024));

/** Human-readable list for upload hints (keep in sync with Laravel `mimes`). */
export const RASTER_IMAGE_FORMATS_LABEL = "JPEG, PNG, WebP, GIF, BMP, or TIFF";

/** Accept list for file inputs (browser + server validate again). */
export const ACCEPT_RASTER_IMAGES =
  "image/jpeg,image/jpg,image/png,image/webp,image/gif,image/bmp,image/tiff,.tif,.tiff";
