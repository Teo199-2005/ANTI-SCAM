import { apiClient } from "@/lib/api/client";
import type { RoomImageRow } from "@/lib/roomImageTypes";
import axios, { type AxiosRequestConfig } from "axios";
import {
  ROOM_PHOTO_MAX_EDGE,
  SHRINK_FOR_UPLOAD_MAX_BYTES,
  shrinkRasterForUpload,
} from "@/lib/uploads/shrinkRasterForUpload";

const UPLOAD_TIMEOUT_MS = 180_000;

/** Weight of each phase within one file's progress slice (must sum to 1). */
const PREP_WEIGHT = 0.28;
const NETWORK_WEIGHT = 0.52;
/** Remaining slice reserved for server save (R2 / Laravel via BFF proxy). */
const SERVER_WEIGHT = 0.2;

export type RoomPhotoUploadPhase = "preparing" | "uploading" | "saving";

export type RoomPhotoUploadProgress = {
  percent: number;
  phase: RoomPhotoUploadPhase;
  fileIndex: number;
  fileCount: number;
  fileName: string;
  label: string;
};

function slicePercent(fileIndex: number, fileCount: number, withinSlice: number): number {
  const slice = 100 / fileCount;
  const start = fileIndex * slice;
  return Math.min(100, start + slice * Math.min(1, withinSlice));
}

function formatMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function phaseLabel(
  phase: RoomPhotoUploadPhase,
  fileName: string,
  fileIndex: number,
  fileCount: number,
  preparedBytes?: number,
): string {
  const ordinal = fileCount > 1 ? ` (${fileIndex + 1} of ${fileCount})` : "";
  const sizeHint = preparedBytes != null && phase !== "preparing" ? ` · ${formatMb(preparedBytes)}` : "";
  switch (phase) {
    case "preparing":
      return `Preparing ${fileName}${ordinal}`;
    case "uploading":
      return `Uploading ${fileName}${ordinal}${sizeHint}`;
    case "saving":
      return `Saving ${fileName} on server${ordinal}${sizeHint}`;
  }
}

function estimateUploadTotalBytes(preparedSize: number, eventTotal: number | undefined): number {
  if (eventTotal != null && eventTotal > 0) {
    return eventTotal;
  }
  // Multipart framing adds a small overhead; avoid division by zero when total is missing.
  return Math.max(preparedSize + 4096, Math.round(preparedSize * 1.04));
}

async function postRoomImages(
  roomId: number,
  formData: FormData,
  config: AxiosRequestConfig,
): Promise<{ data: { success: boolean; data: RoomImageRow[] } }> {
  try {
    return await axios.post<{ success: boolean; data: RoomImageRow[] }>(
      `/api/upload/rooms/${roomId}/images`,
      formData,
      { withCredentials: true, ...config },
    );
  } catch (err) {
    if (axios.isAxiosError(err) && [404, 405, 502, 503].includes(err.response?.status ?? 0)) {
      return apiClient.post<{ success: boolean; data: RoomImageRow[] }>(
        `/rooms/${roomId}/images`,
        formData,
        config,
      );
    }
    throw err;
  }
}

/**
 * Uploads room photos one at a time with honest progress (prepare → network → server).
 * Images are compressed to ~1.8 MB in the browser before upload so progress moves quickly
 * through Cloudflare and the Next.js BFF proxy.
 */
export async function uploadRoomPhotosSequential(
  roomId: number,
  rawFiles: File[],
  onProgress: (progress: RoomPhotoUploadProgress) => void,
): Promise<{ uploaded: RoomImageRow[]; didShrinkInBrowser: boolean }> {
  const fileCount = rawFiles.length;
  const uploaded: RoomImageRow[] = [];
  let didShrinkInBrowser = false;

  for (let fileIndex = 0; fileIndex < fileCount; fileIndex++) {
    const raw = rawFiles[fileIndex]!;
    const fileName = raw.name || `photo-${fileIndex + 1}`;

    const prepared = await shrinkRasterForUpload(
      raw,
      SHRINK_FOR_UPLOAD_MAX_BYTES,
      ROOM_PHOTO_MAX_EDGE,
      (prepRatio) => {
        onProgress({
          percent: slicePercent(fileIndex, fileCount, PREP_WEIGHT * prepRatio),
          phase: "preparing",
          fileIndex,
          fileCount,
          fileName,
          label: phaseLabel("preparing", fileName, fileIndex, fileCount),
        });
      },
    );

    if (prepared.size < raw.size) {
      didShrinkInBrowser = true;
    }

    if (prepared.size > SHRINK_FOR_UPLOAD_MAX_BYTES) {
      throw new Error(
        `After preparing "${fileName}", the file is still ${(prepared.size / (1024 * 1024)).toFixed(1)} MB. Try a smaller image.`,
      );
    }

    const formData = new FormData();
    formData.append("images", prepared);

    let saveCreepTimer: ReturnType<typeof setInterval> | null = null;
    const stopSaveCreep = () => {
      if (saveCreepTimer) {
        clearInterval(saveCreepTimer);
        saveCreepTimer = null;
      }
    };

    const startSaveCreep = () => {
      if (saveCreepTimer) {
        return;
      }
      const floor = slicePercent(fileIndex, fileCount, PREP_WEIGHT + NETWORK_WEIGHT);
      const cap = slicePercent(fileIndex, fileCount, PREP_WEIGHT + NETWORK_WEIGHT + SERVER_WEIGHT * 0.95);
      let current = floor;
      onProgress({
        percent: current,
        phase: "saving",
        fileIndex,
        fileCount,
        fileName,
        label: phaseLabel("saving", fileName, fileIndex, fileCount, prepared.size),
      });
      saveCreepTimer = setInterval(() => {
        if (current < cap) {
          current = Math.min(cap, current + 1.2);
          onProgress({
            percent: current,
            phase: "saving",
            fileIndex,
            fileCount,
            fileName,
            label: phaseLabel("saving", fileName, fileIndex, fileCount, prepared.size),
          });
        }
      }, 400);
    };

    try {
      const { data } = await postRoomImages(roomId, formData, {
          timeout: UPLOAD_TIMEOUT_MS,
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
          onUploadProgress: (event) => {
            const total = estimateUploadTotalBytes(prepared.size, event.total);
            const networkRatio = Math.min(1, event.loaded / total);

            if (networkRatio >= 0.99 || event.loaded >= prepared.size) {
              startSaveCreep();
              return;
            }

            stopSaveCreep();
            const within = PREP_WEIGHT + NETWORK_WEIGHT * networkRatio;
            onProgress({
              percent: slicePercent(fileIndex, fileCount, within),
              phase: "uploading",
              fileIndex,
              fileCount,
              fileName,
              label: phaseLabel("uploading", fileName, fileIndex, fileCount, prepared.size),
            });
          },
        });

      stopSaveCreep();

      if (Array.isArray(data.data)) {
        uploaded.push(...data.data);
      }

      onProgress({
        percent: slicePercent(fileIndex + 1, fileCount, 0),
        phase: "saving",
        fileIndex,
        fileCount,
        fileName,
        label: fileIndex + 1 === fileCount ? "Finishing…" : phaseLabel("saving", fileName, fileIndex, fileCount),
      });
    } finally {
      stopSaveCreep();
    }
  }

  onProgress({
    percent: 100,
    phase: "saving",
    fileIndex: fileCount - 1,
    fileCount,
    fileName: "",
    label: "Complete",
  });

  return { uploaded, didShrinkInBrowser };
}
