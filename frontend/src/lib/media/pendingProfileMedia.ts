export type PendingProfileMediaKind = "logo" | "cover";

const DB_NAME = "rs_pending_profile_media_v1";
const STORE_NAME = "pending";

function storageKey(kind: PendingProfileMediaKind): string {
  return `rs_pending_profile_media_${kind}`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available."));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onerror = () => reject(req.error ?? new Error("Could not open IndexedDB."));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

/** Persist upload across navigation until the crop editor consumes it (survives full page loads). */
export async function stashPendingProfileMedia(
  kind: PendingProfileMediaKind,
  file: File,
): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Could not stash pending media."));
      tx.objectStore(STORE_NAME).put({ kind, file, savedAt: Date.now() }, kind);
    });
    sessionStorage.setItem(storageKey(kind), "idb");
  } finally {
    db.close();
  }
}

/** Consume a file stashed right after profile upload (before opening the crop editor). */
export async function takePendingProfileMedia(
  kind: PendingProfileMediaKind,
): Promise<File | null> {
  if (sessionStorage.getItem(storageKey(kind)) !== "idb") {
    return null;
  }
  sessionStorage.removeItem(storageKey(kind));

  const db = await openDb();
  try {
    const record = await new Promise<{ kind: PendingProfileMediaKind; file: File } | undefined>(
      (resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const getReq = store.get(kind);
        getReq.onsuccess = () => {
          const value = getReq.result as { kind: PendingProfileMediaKind; file: File } | undefined;
          store.delete(kind);
          resolve(value);
        };
        getReq.onerror = () => reject(getReq.error ?? new Error("Could not read pending media."));
        tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed."));
      },
    );
    if (!record || record.kind !== kind || !(record.file instanceof File)) {
      return null;
    }
    return record.file;
  } finally {
    db.close();
  }
}
