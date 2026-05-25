import type { Area } from "react-easy-crop";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", (e) => reject(e));
    img.crossOrigin = "anonymous";
    img.src = src;
  });
}

/**
 * Renders the given crop rectangle (in natural image pixels) to a JPEG blob.
 * Rotation is omitted for simplicity (crop UI keeps rotation at 0).
 */
export async function getCroppedImageBlob(
  imageSrc: string,
  pixelCrop: Area,
  mime: "image/jpeg" | "image/png" = "image/jpeg",
  quality = 0.92,
): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(pixelCrop.width));
  canvas.height = Math.max(1, Math.floor(pixelCrop.height));
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas is not available.");
  }

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("Could not encode image."));
        else resolve(blob);
      },
      mime,
      quality,
    );
  });
}

/** Load the owner's logo or cover via the authenticated BFF (works with R2 without CDN env on Next). */
export async function fetchOwnerProfileMediaAsObjectUrl(kind: "logo" | "cover"): Promise<string> {
  const segment = kind === "cover" ? "background" : "logo";
  const res = await fetch(`/api/backend/resort-owner/profile-media/${segment}`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    let detail = `Failed to load image (${res.status}).`;
    try {
      const json = (await res.json()) as { message?: string };
      if (json.message) detail = json.message;
    } catch {
      // binary or HTML error body
    }
    throw new Error(detail);
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export async function fetchImageAsObjectUrl(url: string): Promise<string> {
  if (!url.trim()) {
    throw new Error("Missing image URL.");
  }

  const absolute =
    typeof window !== "undefined" && url.startsWith("/")
      ? `${window.location.origin}${url}`
      : url;

  // Same-origin /storage/* — Next.js proxy; no CORS issues.
  if (typeof window !== "undefined") {
    try {
      const parsed = new URL(absolute, window.location.origin);
      if (parsed.origin === window.location.origin && parsed.pathname.startsWith("/storage/")) {
        const res = await fetch(parsed.pathname + parsed.search, {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`Failed to load image (${res.status}).`);
        const blob = await res.blob();
        return URL.createObjectURL(blob);
      }
    } catch (e) {
      if (e instanceof Error && e.message.startsWith("Failed to load image")) {
        throw e;
      }
      // fall through to server proxy
    }
  }

  const proxy = `/api/media-fetch?url=${encodeURIComponent(absolute)}`;
  const res = await fetch(proxy, { credentials: "include", cache: "no-store" });
  if (!res.ok) {
    let detail = `Failed to load image (${res.status}).`;
    try {
      const json = (await res.json()) as { message?: string };
      if (json.message) detail = json.message;
    } catch {
      // not JSON
    }
    throw new Error(detail);
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
