export type StoredClientReview = {
  id: string;
  reservationId: number;
  resortId: number;
  resortName: string;
  roomName: string;
  rating: number;
  comment: string;
  createdAt: string;
};

function storageKey(userId: number): string {
  return `rs_client_reviews_${userId}`;
}

export function getStoredReviews(userId: number): StoredClientReview[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(userId));
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as StoredClientReview[]) : [];
  } catch {
    return [];
  }
}

export function saveReview(userId: number, review: Omit<StoredClientReview, "id" | "createdAt"> & { id?: string }): StoredClientReview {
  const list = getStoredReviews(userId);
  const entry: StoredClientReview = {
    id: review.id ?? `rv-${review.reservationId}-${Date.now()}`,
    reservationId: review.reservationId,
    resortId: review.resortId,
    resortName: review.resortName,
    roomName: review.roomName,
    rating: review.rating,
    comment: review.comment,
    createdAt: new Date().toISOString(),
  };
  const filtered = list.filter((r) => r.reservationId !== review.reservationId);
  filtered.unshift(entry);
  localStorage.setItem(storageKey(userId), JSON.stringify(filtered));
  return entry;
}

export function hasReviewForReservation(userId: number, reservationId: number): boolean {
  return getStoredReviews(userId).some((r) => r.reservationId === reservationId);
}
