import { apiClient } from "@/lib/api/client";
import type { ApiEnvelope } from "@/lib/api/types";

export type BulkDeletePayload = {
  deleted: number;
  failed: { id: number | string; message: string }[];
};

async function postBulkDelete<TBody extends Record<string, unknown>>(
  url: string,
  body: TBody,
): Promise<BulkDeletePayload> {
  const { data } = await apiClient.post<ApiEnvelope<BulkDeletePayload>>(url, body);
  return data.data ?? { deleted: 0, failed: [] };
}

export function bulkDeleteUsers(ids: number[]) {
  return postBulkDelete("/users/bulk-delete", { ids });
}

export function bulkDeleteRooms(ids: number[]) {
  return postBulkDelete("/rooms/bulk-delete", { ids });
}

export function bulkDeleteResortGuests(guestKeys: string[]) {
  return postBulkDelete("/resort/guests/bulk-delete", { guest_keys: guestKeys });
}

export function bulkDeleteDiscountCodes(resortId: number, ids: number[]) {
  return postBulkDelete(`/resorts/${resortId}/discount-codes/bulk-delete`, { ids });
}

export function bulkDeleteAvailability(roomId: number, ids: number[]) {
  return postBulkDelete(`/rooms/${roomId}/availability/bulk-delete`, { ids });
}

export function bulkDeleteGuestFavorites(roomIds: number[]) {
  return postBulkDelete("/guest/favorites/bulk-delete", { room_ids: roomIds });
}

export function bulkDeleteToastDescription(result: BulkDeletePayload): string {
  if (result.failed.length === 0) {
    return `${result.deleted} item${result.deleted === 1 ? "" : "s"} removed.`;
  }
  return `${result.deleted} removed, ${result.failed.length} failed.`;
}
