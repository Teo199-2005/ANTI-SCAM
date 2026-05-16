"use client";

import { apiClient } from "@/lib/api/client";
import { flattenLaravelApiErrors, parseApiErrorMessage } from "@/lib/auth/parseApiError";
import { useToast } from "@/components/shared/ToastProvider";
import { roomImagePreviewSrc } from "@/lib/roomImagePreview";
import {
  ACCEPT_RASTER_IMAGES,
  RASTER_IMAGE_FORMATS_LABEL,
  RESORT_ROOM_PHOTO_MAX_BYTES,
  RESORT_ROOM_PHOTO_MAX_MB,
} from "@/lib/uploads/resortProfileUploads";
import { shrinkRasterForUpload } from "@/lib/uploads/shrinkRasterForUpload";
import { Loader2, Star, Trash2, Upload } from "lucide-react";
import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";

export type RoomImageRow = {
  id: number;
  url: string;
  is_primary: boolean;
  original_name: string;
  /** API marks rows whose storage key is missing or invalid (e.g. failed R2 upload). */
  broken?: boolean;
};

type Props = {
  roomId: number;
  /** Renders a Done button for modal flows. */
  onDoneClick?: () => void;
};

export function RoomPhotosPanel({ roomId, onDoneClick }: Props) {
  const { pushToast } = useToast();
  const [images, setImages] = useState<RoomImageRow[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingImg, setDeletingImg] = useState<number | null>(null);
  /** Last upload failure — subtle on-page detail for debugging (HTTP code + API messages). */
  const [lastUploadDetail, setLastUploadDetail] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadImages = useCallback(async () => {
    setLoadingImages(true);
    try {
      const { data } = await apiClient.get<{ success: boolean; data: RoomImageRow[] }>(`/rooms/${roomId}/images`);
      setImages(Array.isArray(data.data) ? data.data : []);
    } catch {
      setImages([]);
      pushToast({ title: "Couldn’t load photos", description: "Try refreshing the page.", tone: "error" });
    } finally {
      setLoadingImages(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pushToast from provider; including it can refetch in a loop
  }, [roomId]);

  useEffect(() => {
    void loadImages();
  }, [loadImages]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setLastUploadDetail(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const existing = images.length;
    const incoming = files.length;
    if (existing + incoming > 5) {
      setLastUploadDetail("Too many files: you can have at most 5 photos per room (including ones already saved).");
      pushToast({
        title: "Upload failed",
        description: "You can only have up to 5 images per room. Remove some images first.",
        tone: "error",
      });
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setUploading(true);
    try {
      const raw = Array.from(files);
      const toUpload: File[] = [];
      let didShrinkInBrowser = false;
      for (const f of raw) {
        try {
          const prepared = await shrinkRasterForUpload(f);
          if (prepared.size > RESORT_ROOM_PHOTO_MAX_BYTES) {
            setLastUploadDetail(
              `After preparing for upload, this file is still ${(prepared.size / (1024 * 1024)).toFixed(1)} MB. Max ${RESORT_ROOM_PHOTO_MAX_MB} MB each.`,
            );
            pushToast({
              title: "Photo too large",
              description: `Each file must end up under ${RESORT_ROOM_PHOTO_MAX_MB} MB.`,
              tone: "error",
            });
            return;
          }
          if (prepared.size < f.size) {
            didShrinkInBrowser = true;
          }
          toUpload.push(prepared);
        } catch (prepErr) {
          const msg = prepErr instanceof Error ? prepErr.message : "Could not prepare this image.";
          setLastUploadDetail(msg);
          pushToast({ title: "Could not prepare photo", description: msg, tone: "error" });
          return;
        }
      }

      const formData = new FormData();
      toUpload.forEach((f) => formData.append("images", f));
      const { data } = await apiClient.post<{ success: boolean; data: RoomImageRow[] }>(`/rooms/${roomId}/images`, formData, {
        timeout: 180_000,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });
      if (Array.isArray(data.data)) {
        await loadImages();
        const n = data.data.length;
        setLastUploadDetail(null);
        pushToast({
          title: n === 1 ? "Photo uploaded" : `${n} photos uploaded`,
          description: didShrinkInBrowser
            ? "Large images were resized in your browser so they fit typical server limits."
            : "They appear in the gallery below.",
          tone: "success",
        });
      }
    } catch (err) {
      const primary = parseApiErrorMessage(err, "Check file type and size, then try again.");
      const lines: string[] = [];
      if (axios.isAxiosError(err) && err.response?.status) {
        lines.push(`HTTP ${err.response.status}`);
      }
      if (axios.isAxiosError(err)) {
        const payload = err.response?.data as { errors?: unknown; message?: string } | undefined;
        lines.push(...flattenLaravelApiErrors(payload?.errors));
        if (typeof payload?.message === "string" && payload.message.trim() !== "" && payload.message !== primary) {
          lines.push(payload.message.trim());
        }
      }
      const merged = [primary, ...lines.filter((l) => l && l !== primary && !primary.includes(l))];
      setLastUploadDetail(merged.join("\n"));
      pushToast({
        title: "Upload failed",
        description: primary,
        tone: "error",
      });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDelete = async (imgId: number) => {
    setDeletingImg(imgId);
    try {
      await apiClient.delete(`/rooms/${roomId}/images/${imgId}`);
      setImages((prev) => prev.filter((i) => i.id !== imgId));
      pushToast({ title: "Photo removed", tone: "success" });
    } catch {
      pushToast({ title: "Delete failed", description: "Could not remove this image.", tone: "error" });
    } finally {
      setDeletingImg(null);
    }
  };

  const handleSetPrimary = async (imgId: number) => {
    try {
      await apiClient.post(`/rooms/${roomId}/images/${imgId}/primary`);
      setImages((prev) => prev.map((i) => ({ ...i, is_primary: i.id === imgId })));
      pushToast({
        title: "Cover photo updated",
        description: "This image is now the primary listing photo.",
        tone: "success",
      });
    } catch {
      pushToast({ title: "Could not set primary", description: "Try again in a moment.", tone: "error" });
    }
  };

  return (
    <div className="space-y-3 md:space-y-4">
      <p className="rounded-xl border border-skyBlue/25 bg-sky-50/90 px-3 py-2 text-xs leading-relaxed text-sky-950 md:px-4 md:py-3 md:text-sm">
        These photos appear on your <strong className="font-semibold">public resort landing</strong> (your{" "}
        <span className="font-mono">/resort/</span> page) and when guests <strong className="font-semibold">explore rooms</strong>{" "}
        for your property. Up to <strong>5</strong> images per room.
      </p>

      <div
        className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-softBorder bg-softGray py-8 transition hover:border-skyBlue hover:bg-metalFace"
        onClick={() => fileRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileRef.current?.click();
          }
        }}
        role="button"
        tabIndex={0}
      >
        {uploading ? (
          <span className="inline-flex items-center gap-2 text-sm text-zinc-500">
            <Loader2 size={16} className="animate-spin" /> Uploading…
          </span>
        ) : (
          <>
            <Upload size={22} className="mb-2 text-zinc-400" />
            <p className="text-sm font-medium text-zinc-600">Click to upload photos</p>
            <p className="mt-1 max-w-sm text-center text-xs leading-relaxed text-zinc-400">
              {RASTER_IMAGE_FORMATS_LABEL} · up to {RESORT_ROOM_PHOTO_MAX_MB} MB each · any aspect ratio · up to 5 files
              total per room. Very large files are resized in your browser so uploads work on typical PHP hosts.
            </p>
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT_RASTER_IMAGES}
          multiple
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      {lastUploadDetail ? (
        <p
          className="whitespace-pre-wrap rounded-lg border border-rose-200/70 bg-rose-50/80 px-3 py-2 text-[11px] leading-relaxed text-rose-900/95"
          role="status"
        >
          {lastUploadDetail}
        </p>
      ) : null}

      {loadingImages ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="aspect-video animate-pulse rounded-xl bg-softGray" />
          ))}
        </div>
      ) : images.length === 0 ? (
        <p className="py-4 text-center text-sm text-zinc-500">No photos yet. Upload some above.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((img) => {
            const broken = Boolean(img.broken);
            const src = roomImagePreviewSrc(roomId, img);

            return (
            <div key={img.id} className="group relative aspect-video overflow-hidden rounded-xl bg-softGray">
              {broken ? (
                <div className="flex h-full flex-col items-center justify-center gap-1 bg-zinc-100 px-2 text-center">
                  <p className="text-[11px] font-semibold text-rose-700">Preview unavailable</p>
                  <p className="text-[10px] leading-snug text-zinc-500">
                    Upload did not finish. Remove this tile and upload again.
                  </p>
                </div>
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={src}
                  alt={img.original_name}
                  className="h-full w-full object-contain object-center"
                  loading="lazy"
                />
              )}
              {img.is_primary ? (
                <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-amber-400/90 px-2 py-0.5 text-[10px] font-bold text-white">
                  <Star size={8} fill="white" /> Primary
                </span>
              ) : null}
              <div className="absolute inset-0 flex items-end justify-between gap-1 bg-gradient-to-t from-black/50 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                {!img.is_primary ? (
                  <button
                    type="button"
                    onClick={() => void handleSetPrimary(img.id)}
                    className="rounded-lg bg-amber-400/90 p-1.5 text-white hover:bg-amber-500"
                    title="Set as primary"
                  >
                    <Star size={12} />
                  </button>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  disabled={deletingImg === img.id}
                  onClick={() => void handleDelete(img.id)}
                  className="ml-auto rounded-lg bg-rose-500/90 p-1.5 text-white hover:bg-rose-600 disabled:opacity-50"
                  title="Delete image"
                >
                  {deletingImg === img.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                </button>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {onDoneClick ? (
        <div className="flex justify-end pt-2 max-md:w-full [&_button]:max-md:w-full">
          <button type="button" onClick={onDoneClick} className="dash-btn-primary px-5 py-2">
            Done
          </button>
        </div>
      ) : null}
    </div>
  );
}
