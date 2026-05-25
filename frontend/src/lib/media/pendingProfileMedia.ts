export type PendingProfileMediaKind = "logo" | "cover";

const pendingFiles = new Map<string, { kind: PendingProfileMediaKind; file: File }>();

function storageKey(kind: PendingProfileMediaKind): string {
  return `rs_pending_profile_media_${kind}`;
}

/** Keep the file in memory for the next profile media editor screen (same SPA session). */
export function stashPendingProfileMedia(kind: PendingProfileMediaKind, file: File): void {
  const id = crypto.randomUUID();
  pendingFiles.set(id, { kind, file });
  sessionStorage.setItem(storageKey(kind), id);
}

/** Consume a file stashed right after profile upload (before opening the crop editor). */
export function takePendingProfileMedia(kind: PendingProfileMediaKind): File | null {
  const id = sessionStorage.getItem(storageKey(kind));
  sessionStorage.removeItem(storageKey(kind));
  if (!id) return null;
  const entry = pendingFiles.get(id);
  pendingFiles.delete(id);
  if (!entry || entry.kind !== kind) return null;
  return entry.file;
}
