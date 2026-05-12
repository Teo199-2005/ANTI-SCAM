/**
 * Re-encode large rasters in the browser so multipart uploads stay under strict PHP
 * `upload_max_filesize` defaults (often 2M) when the API is not started with raised `-d` flags.
 */

const DEFAULT_MAX_EDGE = 2560;

/** Stay under typical 2M PHP `upload_max_filesize` with margin for multipart framing. */
export const SHRINK_FOR_UPLOAD_MAX_BYTES = 1_800_000;

function isProbablyRaster(file: File): boolean {
  return file.type.startsWith("image/") && file.type !== "image/svg+xml";
}

/**
 * If the file is already small enough, returns it unchanged (preserves PNG transparency, etc.).
 * Otherwise decodes, optionally scales, and emits JPEG until under `maxBytes`.
 */
export async function shrinkRasterForUpload(
  file: File,
  maxBytes: number = SHRINK_FOR_UPLOAD_MAX_BYTES,
  maxEdge: number = DEFAULT_MAX_EDGE,
): Promise<File> {
  if (!isProbablyRaster(file) || file.size <= maxBytes) {
    return file;
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("This image could not be read in the browser. Try JPEG or PNG.");
  }

  try {
    let w = bitmap.width;
    let h = bitmap.height;
    const scale0 = Math.min(1, maxEdge / Math.max(w, h, 1));
    w = Math.max(1, Math.round(w * scale0));
    h = Math.max(1, Math.round(h * scale0));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not prepare canvas for this image.");
    }
    ctx.drawImage(bitmap, 0, 0, w, h);

    const baseName = file.name.replace(/\.[^.]+$/i, "") || "room-photo";
    let quality = 0.88;
    let blob: Blob | null = null;

    for (let attempt = 0; attempt < 22; attempt++) {
      blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), "image/jpeg", quality);
      });
      if (blob && blob.size > 0 && blob.size <= maxBytes) {
        return new File([blob], `${baseName}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
      }
      quality -= 0.06;
      if (quality < 0.38) {
        quality = 0.82;
        w = Math.max(640, Math.round(w * 0.88));
        h = Math.max(480, Math.round(h * 0.88));
        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(bitmap, 0, 0, w, h);
      }
    }

    blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.35);
    });
    if (blob && blob.size > 0 && blob.size <= maxBytes) {
      return new File([blob], `${baseName}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
    }

    throw new Error("Could not shrink this image enough for your server upload limit. Try a smaller source file.");
  } finally {
    bitmap.close();
  }
}
