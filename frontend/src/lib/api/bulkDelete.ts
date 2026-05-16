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

function sanitizeBulkDeleteMessage(raw: string | undefined): string {
  const msg = (raw ?? "").trim();
  if (!msg) {
    return "Could not remove this item.";
  }
  if (/SQLSTATE|General error:|Connection:\s*mysql|can't specify target table/i.test(msg)) {
    return "Something went wrong on the server. Please try again.";
  }
  if (msg.length > 120) {
    return "Could not remove this item. Please try again.";
  }
  return msg;
}

export function bulkDeleteToastDescription(result: BulkDeletePayload): string {
  return bulkDeleteToastDescriptionGeneric(result, "item");
}

export function bulkDeleteToastDescriptionGeneric(
  result: BulkDeletePayload,
  itemLabel: string,
): string {
  const deleted = result.deleted ?? 0;
  const failed = result.failed ?? [];

  if (failed.length === 0) {
    return `${deleted} ${itemLabel}${deleted === 1 ? "" : "s"} removed.`;
  }

  const reason = sanitizeBulkDeleteMessage(failed[0]?.message);

  if (deleted === 0) {
    return failed.length === 1 ? reason : `Could not remove selected ${itemLabel}s. ${reason}`;
  }

  return `${deleted} removed. ${failed.length} failed — ${reason}`;
}
