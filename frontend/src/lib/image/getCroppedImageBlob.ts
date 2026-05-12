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

export async function fetchImageAsObjectUrl(url: string): Promise<string> {
  const res = await fetch(url, { credentials: "include", mode: "cors" });
  if (!res.ok) throw new Error(`Failed to load image (${res.status}).`);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
