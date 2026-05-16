import { apiClient } from "@/lib/api/client";
import type { RoomImageRow } from "@/lib/roomImageTypes";
import { RESORT_ROOM_PHOTO_MAX_BYTES } from "@/lib/uploads/resortProfileUploads";
import { ROOM_PHOTO_MAX_EDGE, shrinkRasterForUpload } from "@/lib/uploads/shrinkRasterForUpload";

const UPLOAD_TIMEOUT_MS = 180_000;

/** Weight of each phase within one file's progress slice (must sum to 1). */
const PREP_WEIGHT = 0.28;
const NETWORK_WEIGHT = 0.52;
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
  return Math.min(100, start + slice * withinSlice);
}

function phaseLabel(phase: RoomPhotoUploadPhase, fileName: string, fileIndex: number, fileCount: number): string {
  const ordinal =
    fileCount > 1 ? ` (${fileIndex + 1} of ${fileCount})` : "";
  switch (phase) {
    case "preparing":
      return `Preparing ${fileName}${ordinal}`;
    case "uploading":
      return `Uploading ${fileName}${ordinal}`;
    case "saving":
      return `Saving ${fileName} to server${ordinal}`;
  }
}

/**
 * Uploads room photos one at a time with honest progress (prepare → network → server).
 * Sequential uploads work better through the BFF proxy and give accurate per-file feedback.
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
      RESORT_ROOM_PHOTO_MAX_BYTES,
      ROOM_PHOTO_MAX_EDGE,
      (prepRatio) => {
        const within = PREP_WEIGHT * prepRatio;
        onProgress({
          percent: slicePercent(fileIndex, fileCount, within),
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

    if (prepared.size > RESORT_ROOM_PHOTO_MAX_BYTES) {
      throw new Error(
        `After preparing for upload, "${fileName}" is still ${(prepared.size / (1024 * 1024)).toFixed(1)} MB.`,
      );
    }

    const formData = new FormData();
    formData.append("images", prepared);

    const { data } = await apiClient.post<{ success: boolean; data: RoomImageRow[] }>(
      `/rooms/${roomId}/images`,
      formData,
      {
        timeout: UPLOAD_TIMEOUT_MS,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        onUploadProgress: (event) => {
          const total = event.total ?? prepared.size;
          const networkRatio = total > 0 ? Math.min(1, event.loaded / total) : 0;
          const within =
            networkRatio >= 1
              ? PREP_WEIGHT + NETWORK_WEIGHT
              : PREP_WEIGHT + NETWORK_WEIGHT * networkRatio;
          onProgress({
            percent: slicePercent(fileIndex, fileCount, within),
            phase: networkRatio >= 1 ? "saving" : "uploading",
            fileIndex,
            fileCount,
            fileName,
            label: phaseLabel(networkRatio >= 1 ? "saving" : "uploading", fileName, fileIndex, fileCount),
          });
        },
      },
    );

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
